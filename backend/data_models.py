from typing import List

import pydantic


class RequestData(pydantic.BaseModel):
    texts: List[str]


class ResponseData(pydantic.BaseModel):
    ranks: List[float]
    values: List[float]


class Cols:
    text = 'text'
    score = 'score'
    processed_text = 'processed_text'