import uvicorn

if __name__ == '__main__':
    uvicorn.run('backend.api:app', host="0.0.0.0")
