import re
from typing import List

import uvicorn
import pydantic
import fastapi
from fastapi.middleware import cors

app = fastapi.FastAPI()

# needed for requests from browser to localhost
app.add_middleware(
    cors.CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# needed for post method
class RequestData(pydantic.BaseModel):
    texts: List[str]


@app.post("/sentiment/")
def sentiment_dumb(data: RequestData):
    words_re = r'\w+'
    neg_re = r'trump|covid|corona|pandemic|virus|cases|death'

    def neg_value(text):
        text = text.lower()
        n_negs = len(re.findall(neg_re, text))
        n_words = len(re.findall(words_re, text))
        return (min(n_negs, 2) + n_negs / n_words) / 3

    return [neg_value(t) for t in data.texts]


if __name__ == "__main__":
    # for debugging
    uvicorn.run(app, host="0.0.0.0", port=8000)
