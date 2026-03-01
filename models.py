from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)

class Quest(Base):
    __tablename__ = "quests"

    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)  # Easy/Medium/Hard
    xp_reward = Column(Integer, default=100)
    completed = Column(Boolean, default=False)

    deadline = Column(DateTime, nullable=False)

    # Boss battle
    hp_remaining = Column(Integer, default=100)  # 0 = defeated