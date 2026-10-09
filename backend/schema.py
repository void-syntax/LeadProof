"""
Facts schema for Gemini structured output.

Gemini returns JSON strictly in this shape (response_schema=CallFacts).
The LLM only extracts facts with quotes; rules.py decides everything else.
If the SDK rejects Literal, replace each Literal with an Enum of the same values.
"""

from typing import List, Literal, Optional

from pydantic import BaseModel


class Intro(BaseModel):
    name_said: bool
    project_said: bool
    quote: Optional[str]


class Budget(BaseModel):
    asked: bool
    amount_azn: Optional[float]
    quote: Optional[str]


class Payment(BaseModel):
    method: Literal["cash", "installment", "mortgage", "unknown"]
    quote: Optional[str]


class Need(BaseModel):
    rooms: Optional[int]
    area_m2: Optional[float]
    purpose: Literal["living", "investment", "unknown"]
    quote: Optional[str]


class Showroom(BaseModel):
    offered: bool
    has_time: bool
    discouraged: bool
    quote: Optional[str]


class NextStep(BaseModel):
    type: Literal["showroom_visit", "send_floor_plans", "callback", "none"]
    when: Optional[str]
    client_agreed: bool
    quote: Optional[str]


class PromiseItem(BaseModel):
    topic: Literal[
        "completion_date",
        "construction_start",
        "discount",
        "installment_months",
        "down_payment_pct",
        "price_per_m2",
        "mortgage_rate",
        "price_growth",
        "other",
    ]
    value: Optional[str]      # "2027-06", "5", "36"; discount without a number -> null
    condition: Optional[str]  # "full_payment" or null
    quote: str


class Lead(BaseModel):
    temperature: Literal["hot", "warm", "cold"]
    quote: Optional[str]


class Translation(BaseModel):
    quote: str
    en: str


class CallFacts(BaseModel):
    intro: Intro
    budget: Budget
    payment: Payment
    need: Need
    showroom: Showroom
    next_step: NextStep
    promises: List[PromiseItem]
    lead: Lead
    translations: List[Translation]
    summary_en: str
