# Negativity Balancer:
Using sentiment analysis to reduce bad news visibility.

![negativity-balancer.gif](https://artdgn.github.io/images/negativity-balancer.gif)

## What does this do?
- A browser extension that finds negative elements on the page and makes them less visible:
    - Negativity is calculated using either a DL model running in the background or JS rule based logic.
- The user controls various options (negativity threshold, restying options) via the options menu:
    - Visibility is reduced by increasing transparency, or by hiding the element completely. 
    - Colors can be added for inspection / debugging, or for examining the positivity.
- The negativity classification is by no means perfect (so it's no a "Negativity Blocker" yet :), 
but it does work pretty well to re-balance the amount of negative and positive items on different pages.
  

## Running locally 

### Browser extension (Chrome / Firefox):
- Go to `extension/` folder:
- To install in local environment: `npm install`
- Build: `npm build`
- Add to browser:
    - [Chrome instructions docs](https://developer.chrome.com/extensions/getstarted#manifest):
        - Extensions -> Enable "developer mode" -> 
        "Load unpacked extensions" -> Navigate to `/extension/dist` folder in this project.
        - To update (on code changes): rebuild or use `npm start` to watch for changes, and go to extension details and press update / reload.
    - [Firefox instructions docs](https://extensionworkshop.com/documentation/develop/testing-persistent-and-restart-features/): 
        - Go to `about:addons` -> "gear" icon -> "Install add-on from file.." -> 
        -> Navigate to `/extension/` folder in this project -> choose `negativity-balancer.zip`.
        - To update (on code changes): rebuild and reload the extension.


### Calculation backends:

#### Option #0: Browser side analysis (rule based):
Choose one of the `(JS)` marked options in the "Calculation" drop-down in the extension options 
(on icon press). This will use browser side analysis (using packages listed below in credits).

#### Option #1: Python inference server (first run will take time to download the model)
1. Running in docker without local python:
    - Create a directory to hold the model between runs: `mkdir ~/model_data`
    - `docker run -it --rm -p 8000:8000 -v ~/model_data:/app/data artdgn/negativity-balancer`

2. Local python:
    - To create local virtual environment and install (after cloning repo): `make install`
    - Run server: `make server`

### Credits:
- Python (DL based) sentiment analysis model and package: [flair NLP](https://github.com/flairNLP/flair)
- JS sentiment analysis packages:
    - [vaderSentiment](https://github.com/cjhutto/vaderSentiment) (called JS-Vader in options menu)
    - [AFINNSentiment](https://github.com/thisandagain/sentiment ) (called JS-AFINN in options menu)
- Backend API framework: [fastapi](https://github.com/tiangolo/fastapi)
- Initial code for browser extension functionality copied from [Trump-Filter](https://github.com/RobSpectre/Trump-Filter)