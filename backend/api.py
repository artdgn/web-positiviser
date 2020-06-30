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
def sentiment_stub(data: RequestData):
    return [min(1, len(t) / 144) for t in data.texts]


if __name__ == "__main__":
    # for debugging
    uvicorn.run(app, host="0.0.0.0", port=8000)
