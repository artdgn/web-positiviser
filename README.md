## Negativity Balancer:
Using sentiment analysis to reduce bad news visibility.

![negativity-balancer.gif](https://artdgn.github.io/images/negativity-balancer.gif)

## What is this?
- A browser extension that uses a sentiment analysis model
running in the background to score elements based on negativity 
of the text in them and adjust the style to reduce their visibility.
- This is very much a work in progress and not a ready to be used extension
since it requires running an additional service locally for getting
reasonable sentiment scores.
- The negativity classification is by no means perfect (so it's no a "Negativity Blocker" yet :), 
but it does work pretty well to re-balance the amount of negative and positive items on different pages.
  

### Running locally 

#### Browser extension (Chrome / Firefox):
- Install:
    - [Chrome instructions docs](https://developer.chrome.com/extensions/getstarted#manifest):
        - Extensions -> Enable "developer mode" -> 
        "Load unpacked extensions" -> Navigate to "/extension" folder in this project.
    - [Firefox instructions docs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension#Installing): 
        - about:debugging -> "This firefox" link -> 
        "Load temporary add-on" -> Choose any file in the extension folder (e.g. `manifest.json`)
- To update (on code changes): go to extension details and press update / reload.
   

#### Inference server (first run will take time to download the model):
##### Option #1: Docker:
- Create a directory to hold the model between runs: `mkdir ~/model_data`
- `docker run -it --rm -p 8000:8000 -v ~/model_data:/app/data artdgn/negativity-balancer`

##### Option #2: Local python:
- Install in local virtual environment (after cloning repo): `make install`
- Run server: `make server`

##### Option #3: No backend:
- Just choose **"JS-Stub"** in "Calculation" option in the extension options 
(on icon press). This will use browser side analysis, that is **very** naive for 
now. I'm planning on adding a proper rule based library to do that, or eventually try doing DL inference in JS.  

### Credits:
- Sentiment analysis model and package: [flair NLP](https://github.com/flairNLP/flair)
- Backend API framework: [fastapi](https://github.com/tiangolo/fastapi)
- Initial code for browser extension functionality copied from [Trump-Filter](https://github.com/RobSpectre/Trump-Filter)