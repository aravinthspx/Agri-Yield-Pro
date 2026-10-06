import urllib.request
import json
import traceback

try:
    req1 = urllib.request.Request(
        'http://localhost:8000/api/crop-plans', 
        method='POST', 
        headers={'Content-Type':'application/json'}, 
        data=json.dumps({'crop_id':'rice','area_ha':2}).encode()
    )
    plan = json.loads(urllib.request.urlopen(req1).read().decode())
    plan_id = plan["plan_id"]

    req_hr = urllib.request.Request(
        f'http://localhost:8000/api/crop-plans/{plan_id}/weather-update', 
        method='POST', 
        headers={'Content-Type':'application/json'}, 
        data=json.dumps({'rain_probability':85,'humidity':90,'is_simulation':True}).encode()
    )
    urllib.request.urlopen(req_hr)

    req_dr = urllib.request.Request(
        f'http://localhost:8000/api/crop-plans/{plan_id}/weather-update', 
        method='POST', 
        headers={'Content-Type':'application/json'}, 
        data=json.dumps({'rain_probability':5,'temperature':38,'is_simulation':True}).encode()
    )
    res_dr = urllib.request.urlopen(req_dr)
    print("SUCCESS")
except Exception as e:
    print("ERROR:", e)
    if hasattr(e, 'read'):
        print(e.read().decode())
    traceback.print_exc()
