## Bad News Fader:
POC for a browser extension to alter negative items on page (e.g. via sentiment analysis)

### Local development 

#### Python inference server:
- Install locally: `make install`
- Run server: `make server`

#### Browser extension (Chrome for now):
- Install (Chrome):
    - Navigate to extensions.
    - Enable "developer mode".
    - "Load unpacked extensions".
    - Navigate to "/extension" folder in this project.
- Enable: press extension icon (no disable yet).
- Update (code changes): go to extension details and press update.
   

### Credits:
- Initial code for browser extension functionality taken from https://github.com/RobSpectre/Trump-Filter