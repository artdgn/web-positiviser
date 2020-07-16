import logging

import fastapi
from fastapi.middleware import cors

from backend import data_models
from backend.sentiment import flairnlp
from backend.utils import common

common.pandas_options()

logger = logging.getLogger(__name__)

app = fastapi.FastAPI()

# needed for requests from browser to localhost
app.add_middleware(
    cors.CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/sentiment/")
def sentiment_flair(data: data_models.RequestData):
    cols = data_models.Cols

    df_out = flairnlp.sentiment_results_dataframe(data.texts)

    return data_models.ResponseData(
        values=df_out[cols.score].to_list(),
        ranks=df_out[cols.score].rank(method='first').to_list())

    return {'values': values_df['score'].to_list(),
            'ranks': values_df['score'].rank(method='first').to_list()}

