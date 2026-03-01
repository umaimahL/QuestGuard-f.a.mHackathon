from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from database import SessionLocal, engine, Base
import models as models

Base.metadata.create_all(bind=engine)

app = FastAPI(title="QuestGuard API")

# Allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.on_event("startup")
def ensure_user():
    db = SessionLocal()
    user = db.query(models.User).first()
    if not user:
        db.add(models.User(xp=0, level=1))
        db.commit()
    db.close()


def calculate_xp(difficulty: str) -> int:
    return {"Easy": 100, "Medium": 200, "Hard": 300}.get(difficulty, 150)


def calculate_monster(deadline: datetime):
    # use UTC consistently
    now = datetime.now(timezone.utc)
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)

    delta = deadline - now
    days_left = delta.days
    # threat goes up as days_left goes down
    threat = max(0, min(100, 100 - days_left * 10))

    if days_left > 10:
        stage, emoji = "baby", "🐣"
    elif days_left > 5:
        stage, emoji = "small", "🐉"
    elif days_left > 2:
        stage, emoji = "medium", "😈"
    elif days_left > 0:
        stage, emoji = "large", "👹"
    else:
        stage, emoji = "boss", "☠️"

    return {
        "days_left": days_left,
        "threat": threat,
        "stage": stage,
        "monster": emoji
    }


def level_threshold(level: int) -> int:
    return level * 500


def add_xp(db: Session, user: models.User, amount: int):
    user.xp += amount
    # Level up possibly multiple times
    while user.xp >= level_threshold(user.level):
        user.level += 1


@app.get("/user")
def get_user(db: Session = Depends(get_db)):
    user = db.query(models.User).first()
    return {"id": user.id, "xp": user.xp, "level": user.level}


@app.post("/create-quest")
def create_quest(
    title: str,
    difficulty: str,
    deadline: str,  # ISO string
    db: Session = Depends(get_db)
):
    if difficulty not in ["Easy", "Medium", "Hard"]:
        raise HTTPException(
            status_code=400, detail="difficulty must be Easy/Medium/Hard")

    try:
        # React will send an ISO string, often with 'Z' or timezone.
        # fromisoformat doesn't like trailing Z, so handle it.
        deadline_clean = deadline.replace("Z", "+00:00")
        dt = datetime.fromisoformat(deadline_clean)
    except Exception:
        raise HTTPException(
            status_code=400, detail="deadline must be ISO datetime")

    xp_reward = calculate_xp(difficulty)

    quest = models.Quest(
        title=title.strip(),
        difficulty=difficulty,
        xp_reward=xp_reward,
        completed=False,
        deadline=dt,
        hp_remaining=100
    )

    db.add(quest)
    db.commit()
    db.refresh(quest)

    return {"message": "Quest created", "id": quest.id}


@app.get("/quests")
def list_quests(db: Session = Depends(get_db)):
    quests = db.query(models.Quest).order_by(models.Quest.id.desc()).all()
    result = []
    for q in quests:
        m = calculate_monster(q.deadline)
        result.append({
            "id": q.id,
            "title": q.title,
            "difficulty": q.difficulty,
            "xp_reward": q.xp_reward,
            "completed": q.completed,
            "deadline": q.deadline.isoformat(),
            "hp_remaining": q.hp_remaining,
            **m
        })
    return result


@app.post("/hit-quest/{quest_id}")
def hit_quest(quest_id: int, minutes: int = 10, db: Session = Depends(get_db)):
    quest = db.query(models.Quest).filter(models.Quest.id == quest_id).first()
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    if quest.completed:
        return {"message": "Quest already completed", "hp_remaining": quest.hp_remaining}

    user = db.query(models.User).first()

    minutes = max(1, min(180, minutes))  # clamp
    damage = minutes * 2                 # 10 min => 20 damage
    quest.hp_remaining = max(0, quest.hp_remaining - damage)

    # small XP for showing effort
    xp_gain = max(10, minutes * 2)       # 10 min => 20 XP
    add_xp(db, user, xp_gain)

    if quest.hp_remaining == 0:
        quest.completed = True

    db.commit()

    return {
        "message": "Hit registered",
        "damage": damage,
        "xp_gain": xp_gain,
        "hp_remaining": quest.hp_remaining,
        "completed": quest.completed,
        "user": {"xp": user.xp, "level": user.level}
    }


@app.post("/complete-quest/{quest_id}")
def complete_quest(quest_id: int, db: Session = Depends(get_db)):
    quest = db.query(models.Quest).filter(models.Quest.id == quest_id).first()
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")

    if quest.completed:
        return {"message": "Already completed"}

    user = db.query(models.User).first()

    quest.completed = True
    quest.hp_remaining = 0
    add_xp(db, user, quest.xp_reward)

    db.commit()

    return {
        "message": "Quest completed",
        "user": {"xp": user.xp, "level": user.level}
    }


@app.get("/gps")
def gps_summary(db: Session = Depends(get_db)):
    quests = db.query(models.Quest).all()
    total = len(quests)
    completed = len([q for q in quests if q.completed])
    progress = 0 if total == 0 else round((completed / total) * 100)

    active = [q for q in quests if not q.completed]

    biggest = None
    recommended = None
    if active:
        # ... compute biggest threat quest q ...
        recommended = {
            "id": q.id,
            "title": f"Study: {q.title}",
            "minutes": 10,
            "xp_reward": max(10, 10 * 2),
        }
    global_threat = 0

    if active:
        scored = []
        for q in active:
            m = calculate_monster(q.deadline)
            scored.append((m["threat"], q, m))

        scored.sort(key=lambda x: x[0], reverse=True)
        threat, q, m = scored[0]

        biggest = {
            "id": q.id,
            "title": q.title,
            "threat": m["threat"],
            "monster": m["monster"],
            "days_left": m["days_left"],
            "hp_remaining": q.hp_remaining
        }

        global_threat = m["threat"]

        # recommended action: hit the biggest threat quest
        recommended = {
            "id": q.id,
            "title": f"Work on: {q.title}",
            "minutes": 10,
            "xp_reward": max(10, 10 * 2),
        }

    # risk label + reason
    if global_threat >= 70:
        risk = "HIGH"
        reason = "Deadline approaching"
    elif global_threat >= 40:
        risk = "MEDIUM"
        reason = "Stay consistent to avoid last-minute stress"
    else:
        risk = "LOW"
        reason = "No urgent deadlines"

    return {
        "journey_progress_percent": progress,
        "quests_total": total,
        "quests_completed": completed,
        "global_threat": global_threat,
        "risk": risk,
        "risk_reason": reason,
        "biggest_threat": biggest,
        "recommended": recommended
    }


@app.post("/reset")
def reset(progress_only: bool = False, db: Session = Depends(get_db)):
    user = db.query(models.User).first()
    user.xp = 0
    user.level = 1

    if not progress_only:
        db.query(models.Quest).delete()

    db.commit()
    return {"message": "Reset complete", "progress_only": progress_only}
