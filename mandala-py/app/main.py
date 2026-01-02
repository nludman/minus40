from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, Header
from fastapi.responses import JSONResponse
import os
import subprocess
import json

app = FastAPI()

API_KEY = os.getenv("MANDALA_API_KEY", "")
REPO_STYLE_SCRIPT = os.getenv("MANDALA_SEGMENTS_SCRIPT", "segments_for_year.py")
PYTHON_DIR = os.getenv("MANDALA_PYTHON_DIR", "/app/python")  # optional if you later copy python/ in

def require_key(x_api_key: str | None):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="bad_api_key")

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/segments/year")
def segments_year(year: int, x_api_key: str | None = Header(default=None)):
    require_key(x_api_key)

    if year < 1900 or year > 2200:
        raise HTTPException(status_code=400, detail="bad_year")

    # If you copy your existing repo python folder into the container later,
    # you can call it directly. For now, assume you will place the script in /app/python.
    script_path = os.path.join(PYTHON_DIR, REPO_STYLE_SCRIPT)

    if not os.path.exists(script_path):
        raise HTTPException(
            status_code=500,
            detail=f"missing_script: expected {script_path}. (Copy your repo /python folder into the image.)"
        )

    try:
        p = subprocess.run(
            ["python", script_path, str(year)],
            check=True,
            capture_output=True,
            text=True,
        )
        text = p.stdout.strip()

        # mimic your Next route parser: find the first JSON object in stdout
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            raise ValueError("no_json_in_stdout")

        payload = json.loads(text[start:end+1])
        return JSONResponse(payload)
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=e.stderr or "python_failed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



class UserChartBody(BaseModel):
    birth_utc: str

@app.get("/transits/date")
def transits_for_date(date: str, x_api_key: str | None = Header(default=None)):
    require_key(x_api_key)

    script_path = os.path.join(PYTHON_DIR, "transits_for_date.py")
    if not os.path.exists(script_path):
        raise HTTPException(status_code=500, detail=f"missing_script: {script_path}")

    try:
        p = subprocess.run(
            ["python", script_path, date],
            check=True,
            capture_output=True,
            text=True,
        )
        text = p.stdout.strip()
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            raise ValueError("no_json_in_stdout")
        return JSONResponse(json.loads(text[start:end+1]))
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=e.stderr or "python_failed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chart/generate")
def chart_generate(body: UserChartBody, x_api_key: str | None = Header(default=None)):
    require_key(x_api_key)

    # IMPORTANT: set this to the real script your Next route currently calls
    # (see section 2 below to find the filename)
    script_path = os.path.join(PYTHON_DIR, "user_chart_for_birth.py")
    if not os.path.exists(script_path):
        raise HTTPException(status_code=500, detail=f"missing_script: {script_path}")

    try:
        args = ["python", script_path, body.birth_utc]

        p = subprocess.run(args, check=True, capture_output=True, text=True)
        text = p.stdout.strip()

        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            raise ValueError("no_json_in_stdout")
        
        return JSONResponse(json.loads(text[start:end+1]))
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=e.stderr or "python_failed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
