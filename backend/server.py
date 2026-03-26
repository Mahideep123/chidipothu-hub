from fastapi import FastAPI, HTTPException, Depends, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import os, jwt, random, smtplib, cloudinary, cloudinary.uploader
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
import base64
import urllib.request
import urllib.parse
from fastapi.responses import StreamingResponse, JSONResponse, RedirectResponse

load_dotenv()

app = FastAPI(title="Chidipothu Hub API")

origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://chidipothu-hub-zfpr.vercel.app",
    "https://chidipothu-hub.vercel.app",
    "https://chidipothusridhar.vercel.app"
]
if os.getenv("FRONTEND_URL"):
    origins.append(os.getenv("FRONTEND_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app", # Allow all Vercel previews/domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB
client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
db = client[os.getenv("DB_NAME", "chidipothu_hub")]

@app.on_event("startup")
async def startup_db_client():
    # Improve search performance with indexes
    await db.properties.create_index([
        ("owner_name", "text"), 
        ("document_number", "text"), 
        ("survey_number", "text"),
        ("village", "text")
    ])
    await db.properties.create_index("created_at")
    await db.properties.create_index("property_type")
    
    # OTP optimization
    await db.otps.create_index("email")
    await db.otps.create_index("expires_at", expireAfterSeconds=0) # Auto-delete expired OTPs

# Cloudinary config
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)

JWT_SECRET = os.getenv("JWT_SECRET", "chidipothu_secret_key_2024")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 12

GMAIL_USER = os.getenv("GMAIL_USER", "S10719346@gmail.com")
GMAIL_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")

security = HTTPBearer()

# ─── Models ───────────────────────────────────────────────────────────────────

class OTPRequest(BaseModel):
    email: str

class OTPVerify(BaseModel):
    email: str
    otp: str

class PasswordLogin(BaseModel):
    password: str

class FileAttachment(BaseModel):
    name: str
    url: str
    public_id: Optional[str] = None
    type: str  # image | pdf | doc

class PropertyCreate(BaseModel):
    state: str = ""
    district: str = ""
    mandal: str = ""
    village: str = ""
    property_type: str = "House"
    property_name: str = ""
    door_no: str = ""
    owner_name: str = ""
    plot_no: str = ""
    document_number: str = ""
    survey_number: str = ""
    lpm_number: str = ""
    patta_number: str = ""
    land_as_per_1b: str = ""
    khata_number: str = ""
    assessment_number: str = ""
    mother_document: str = ""
    document_location: str = ""
    remarks: str = ""
    extent_value: str = ""
    extent_unit: str = "Acres"
    # Location enhancements
    location_type: str = "Village" # Village | City
    city: str = ""
    road_street: str = ""
    area: str = ""
    pincode: str = ""
    # Checklist
    document_checklist: List[dict] = [] # List of { name: str, pages: str }
    file_attachments: List[FileAttachment] = []

class FileUploadRequest(BaseModel):
    file_data: str  # base64
    file_name: str
    file_type: str  # image | pdf | doc

# ─── Auth Helpers ──────────────────────────────────────────────────────────────

def create_jwt(email: str) -> str:
    payload = {
        "sub": email,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return verify_jwt(credentials.credentials)

def send_otp_email(to_email: str, otp: str):
    msg = MIMEMultipart()
    msg["From"] = GMAIL_USER
    msg["To"] = to_email
    msg["Subject"] = "Chidipothu Hub - Your OTP Code"

    body = f"""
    <html><body style="font-family:Arial,sans-serif;background:#f5f7fa;padding:30px">
      <div style="max-width:480px;margin:auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
        <h2 style="color:#1e293b;margin-bottom:8px">Chidipothu Hub</h2>
        <p style="color:#64748b;margin-bottom:24px">Property Management System</p>
        <p style="color:#374151;font-size:15px">Your one-time login code is:</p>
        <div style="background:#f0f4ff;border-radius:8px;padding:20px;text-align:center;margin:20px 0">
          <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#3b82f6">{otp}</span>
        </div>
        <p style="color:#6b7280;font-size:13px">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
        <p style="color:#9ca3af;font-size:12px">If you did not request this, ignore this email.</p>
      </div>
    </body></html>
    """
    msg.attach(MIMEText(body, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_PASSWORD)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False

# ─── Auth Routes ───────────────────────────────────────────────────────────────

@app.post("/api/auth/send-otp")
async def send_otp(req: OTPRequest):
    allowed_emails = [GMAIL_USER, "S10719346@gmail.com"]
    if req.email.lower() not in [e.lower() for e in allowed_emails]:
        raise HTTPException(status_code=403, detail="Email not authorized")

    otp = str(random.randint(100000, 999999))
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    await db.otps.delete_many({"email": req.email})
    await db.otps.insert_one({
        "email": req.email,
        "otp": otp,
        "expires_at": expires_at,
        "used": False,
    })

    success = send_otp_email(req.email, otp)
    if not success:
        # For dev: return OTP in response if email fails
        return {"message": "OTP generated (email failed - check server logs)", "dev_otp": otp}

    return {"message": "OTP sent successfully"}

@app.post("/api/auth/password-login")
async def password_login(req: PasswordLogin):
    expected_password = os.getenv("LOGIN_PASSWORD", "234")
    if req.password != expected_password:
        raise HTTPException(status_code=401, detail="Incorrect password")
    admin_name = os.getenv("ADMIN_USERNAME", "SRIDHAR CHIDIPOTHU")
    token = create_jwt(admin_name)
    return {"token": token, "user": admin_name}

@app.post("/api/auth/verify-otp")
async def verify_otp(req: OTPVerify):
    record = await db.otps.find_one({"email": req.email, "used": False})
    if not record:
        raise HTTPException(status_code=400, detail="No OTP found. Request a new one.")

    if datetime.utcnow() > record["expires_at"]:
        await db.otps.delete_one({"_id": record["_id"]})
        raise HTTPException(status_code=400, detail="OTP expired. Request a new one.")

    if record["otp"] != req.otp:
        raise HTTPException(status_code=400, detail="Incorrect OTP")

    await db.otps.update_one({"_id": record["_id"]}, {"$set": {"used": True}})
    token = create_jwt(req.email)
    return {"token": token, "email": req.email, "expires_in": JWT_EXPIRE_HOURS * 3600}

# ─── File Upload ───────────────────────────────────────────────────────────────

@app.post("/api/upload")
async def upload_file(req: FileUploadRequest, request: Request, current_user: dict = Depends(get_current_user)):
    try:
        data_uri = req.file_data
        if not data_uri.startswith("data:"):
            data_uri = f"data:application/octet-stream;base64,{req.file_data}"

        resource_type = "image" if req.file_type == "image" else "raw"
        result = cloudinary.uploader.upload(
            data_uri,
            folder="chidipothu_hub",
            resource_type=resource_type,
            public_id=f"{datetime.utcnow().timestamp()}_{req.file_name}",
        )

        return {
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "name": req.file_name,
            "type": req.file_type,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.delete("/api/upload/{public_id:path}")
async def delete_file(public_id: str, current_user: dict = Depends(get_current_user)):
    try:
        cloudinary.uploader.destroy(public_id)
        return {"deleted": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/proxy-file/{public_id:path}")
def proxy_file(public_id: str, resource_type: str = "raw", filename: str = None, disposition: str = None):
    # Log for debugging (Render logs)
    print(f"DEBUG: Proxy request for {public_id}, type={resource_type}, name={filename}, disposition={disposition}")
    
    try:
        # Check Cloudinary config
        if not cloudinary.config().cloud_name:
            print("ERROR: Cloudinary config missing!")
            # If config is missing, try to use public_id directly if it looks like a URL
            if public_id.startswith("http"):
                url = public_id
            else:
                return JSONResponse({"error": "Cloudinary config missing"}, status_code=500)
        else:
            clean_id = urllib.parse.unquote(public_id)
            url, _ = cloudinary.utils.cloudinary_url(
                clean_id, 
                resource_type=resource_type, 
                secure=True
            )
        
        print(f"DEBUG: Internal Cloudinary URL: {url}")
        
        # Simple fetch with urllib
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        response = urllib.request.urlopen(req, timeout=15)
        
        content_type = response.headers.get("Content-Type", "application/octet-stream")
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": content_type
        }
        
        # Determine disposition: if filename is provided, default to attachment (download)
        # If disposition is explicitly set, use that. Otherwise inline for viewing.
        if filename:
            from urllib.parse import quote
            safe_filename = quote(filename).replace("%20", "_")
            disp_type = disposition if disposition in ("inline", "attachment") else "attachment"
            headers["Content-Disposition"] = f'{disp_type}; filename="{safe_filename}"'
        else:
            # No filename = viewing mode, use inline so PDFs render in browser
            headers["Content-Disposition"] = "inline"
        
        return StreamingResponse(response, headers=headers)
    except Exception as e:
        print(f"Proxy critical error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Dashboard ────────────────────────────────────────────────────────────────

@app.get("/api/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    total = await db.properties.count_documents({})
    types = ["House", "Shop", "Agriculture Land", "Site", "Commercial Godown"]
    counts = {}
    for t in types:
        counts[t] = await db.properties.count_documents({"property_type": t})

    location_stats = {
        "states": await db.properties.aggregate([{"$group": {"_id": "$state"}}, {"$project": {"name": "$_id", "_id": 0}}]).to_list(None),
        "districts": await db.properties.aggregate([{"$group": {"_id": "$district"}}, {"$project": {"name": "$_id", "_id": 0}}]).to_list(None),
        "mandals": await db.properties.aggregate([{"$group": {"_id": "$mandal"}}, {"$project": {"name": "$_id", "_id": 0}}]).to_list(None),
        "villages": await db.properties.aggregate([{"$group": {"_id": "$village", "type": {"$first": "$location_type"}}}, {"$match": {"type": "Village"}}, {"$project": {"name": "$_id", "_id": 0}}]).to_list(None),
        "cities": await db.properties.aggregate([{"$group": {"_id": "$city", "type": {"$first": "$location_type"}}}, {"$match": {"type": "City"}}, {"$project": {"name": "$_id", "_id": 0}}]).to_list(None),
    }

    return {
        "total": total,
        "by_type": counts,
        "locations": location_stats,
    }

# ─── Locations ────────────────────────────────────────────────────────────────

@app.get("/api/locations")
async def get_locations(current_user: dict = Depends(get_current_user)):
    pipeline = [
        {"$group": {"_id": {
            "state": "$state", "district": "$district", "mandal": "$mandal", 
            "village": "$village", "city": "$city", "location_type": "$location_type"
        }}},
        {"$project": {
            "state": "$_id.state", "district": "$_id.district",
            "mandal": "$_id.mandal", "village": "$_id.village", 
            "city": "$_id.city", "location_type": "$_id.location_type", "_id": 0
        }}
    ]
    return await db.properties.aggregate(pipeline).to_list(None)

# ─── Properties ───────────────────────────────────────────────────────────────

def serialize_property(p):
    p["id"] = str(p["_id"])
    del p["_id"]
    return p

@app.get("/api/properties")
async def get_properties(
    search: str = "", state: str = "", village: str = "", city: str = "", property_type: str = "",
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if state:
        query["state"] = {"$regex": state, "$options": "i"}
    if village:
        query["village"] = {"$regex": village, "$options": "i"}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if property_type:
        query["property_type"] = property_type
    if search:
        query["$or"] = [
            {"owner_name": {"$regex": search, "$options": "i"}},
            {"document_number": {"$regex": search, "$options": "i"}},
            {"patta_number": {"$regex": search, "$options": "i"}},
            {"khata_number": {"$regex": search, "$options": "i"}},
            {"survey_number": {"$regex": search, "$options": "i"}},
            {"village": {"$regex": search, "$options": "i"}},
            {"mandal": {"$regex": search, "$options": "i"}},
            {"district": {"$regex": search, "$options": "i"}},
        ]
    props = await db.properties.find(query).sort("created_at", -1).to_list(None)
    return [serialize_property(p) for p in props]

@app.get("/api/properties/{prop_id}")
async def get_property(prop_id: str, current_user: dict = Depends(get_current_user)):
    from bson import ObjectId
    p = await db.properties.find_one({"_id": ObjectId(prop_id)})
    if not p:
        raise HTTPException(status_code=404, detail="Property not found")
    return serialize_property(p)

@app.post("/api/properties")
async def create_property(prop: PropertyCreate, current_user: dict = Depends(get_current_user)):
    doc = prop.model_dump()
    doc["created_at"] = datetime.utcnow()
    doc["updated_at"] = datetime.utcnow()
    
    # Ensure mandatory location fields
    if not (doc.get("state") and doc.get("district") and doc.get("mandal")):
        raise HTTPException(status_code=400, detail="State, District, and Mandal are mandatory")
    if doc.get("location_type") == "Village" and not doc.get("village"):
        raise HTTPException(status_code=400, detail="Village name is mandatory")
    if doc.get("location_type") == "City" and not doc.get("city"):
        raise HTTPException(status_code=400, detail="City name is mandatory")

    result = await db.properties.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Property created"}

@app.put("/api/properties/{prop_id}")
async def update_property(prop_id: str, prop: PropertyCreate, current_user: dict = Depends(get_current_user)):
    from bson import ObjectId
    # 1. Get old property to compare attachments
    old_p = await db.properties.find_one({"_id": ObjectId(prop_id)})
    if not old_p:
        raise HTTPException(status_code=404, detail="Property not found")
        
    old_pids = {f.get("public_id") for f in old_p.get("file_attachments", []) if f.get("public_id")}
    new_pids = {f.public_id for f in prop.file_attachments if f.public_id}
    
    # 2. Identify and delete removed attachments from Cloudinary
    removed_pids = old_pids - new_pids
    for pid in removed_pids:
        try:
            cloudinary.uploader.destroy(pid)
        except Exception as e:
            print(f"DEBUG: Error deleting derived file {pid} from Cloudinary: {e}")

    # 3. Update MongoDB
    doc = prop.model_dump()
    doc["updated_at"] = datetime.utcnow()
    # Ensure mandatory location fields (all of them are now required)
    if not (doc.get("state") and doc.get("district") and doc.get("mandal")):
        raise HTTPException(status_code=400, detail="State, District, and Mandal are mandatory")
    if doc.get("location_type") == "Village" and not doc.get("village"):
        raise HTTPException(status_code=400, detail="Village name is mandatory")
    if doc.get("location_type") == "City" and not doc.get("city"):
        raise HTTPException(status_code=400, detail="City name is mandatory")

    result = await db.properties.update_one({"_id": ObjectId(prop_id)}, {"$set": doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    return {"message": "Property updated"}

@app.delete("/api/properties/{prop_id}")
async def delete_property(prop_id: str, current_user: dict = Depends(get_current_user)):
    from bson import ObjectId
    # 1. Get property to find attachments
    p = await db.properties.find_one({"_id": ObjectId(prop_id)})
    if not p:
        raise HTTPException(status_code=404, detail="Property not found")
        
    # 2. Delete attachments from Cloudinary
    for feat in p.get("file_attachments", []):
        if feat.get("public_id"):
            try:
                cloudinary.uploader.destroy(feat["public_id"])
            except Exception as e:
                print(f"DEBUG: Error deleting file {feat['public_id']} from Cloudinary: {e}")
                
    # 3. Delete from MongoDB
    result = await db.properties.delete_one({"_id": ObjectId(prop_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    return {"message": "Property deleted and attachments removed"}

@app.get("/api/")
async def health():
    return {"status": "ok", "app": "Chidipothu Hub"}
