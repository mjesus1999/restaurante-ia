from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import json
import random
from datetime import datetime
from dateutil import tz
import emoji

app = FastAPI()

# Montar archivos estáticos
app.mount("/static", StaticFiles(directory="static"), name="static")

# Configurar templates
templates = Jinja2Templates(directory="templates")

# Permitir CORS para desarrollo (ajusta los orígenes en producción)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cargar platillos desde un archivo JSON
with open('platillos.json', 'r', encoding='utf-8') as f:
    PLATILLOS = json.load(f)

TIPS = [
    "¿Sabías que el ceviche es uno de los platillos más populares en verano por su frescura?",
    "La pizza Margherita fue creada en honor a la reina Margherita de Italia.",
    "El sushi no siempre lleva pescado crudo, ¡prueba las opciones vegetarianas!",
    "El lomo saltado es un ejemplo perfecto de la fusión chino-peruana.",
    "El Pad Thai es el platillo nacional de Tailandia y se sirve en casi todos los mercados callejeros.",
    "El falafel es una excelente fuente de proteína vegetal para dietas veganas.",
    "La causa limeña es ideal para días calurosos por su frescura y sabor cítrico."
]

SALUDOS = [
    "¡Hoy es un gran día para descubrir nuevos sabores!",
    "Recuerda: la mejor receta es la que se comparte con una sonrisa.",
    "¿Listo para una experiencia culinaria única? ¡Déjame sorprenderte!",
    "La cocina es el arte de transformar ingredientes en felicidad. ¡Vamos a crear magia!",
    "¡Bienvenido! Estoy aquí para ayudarte a encontrar el platillo perfecto para ti.",
    "Explora, prueba y disfruta. ¡La aventura gastronómica comienza ahora!"
]

def recomendar_platillos(preferencias):
    resultados = []
    etiquetas_nutricionales = preferencias.get('etiquetas_nutricionales', [])
    presupuesto = preferencias.get('presupuesto', 100)
    for platillo in PLATILLOS:
        ingredientes = platillo.get('ingredientes', [])
        # Filtros culturales/religiosos
        if 'vegetariano' in preferencias.get('preferencias_culturales', []):
            if any(ing in ingredientes for ing in ['pollo', 'carne', 'res', 'cerdo', 'pato', 'chicharrón', 'huevo', 'pescado', 'mariscos']):
                continue
        if 'vegano' in preferencias.get('preferencias_culturales', []):
            if any(ing in ingredientes for ing in ['pollo', 'carne', 'res', 'cerdo', 'pato', 'chicharrón', 'huevo', 'pescado', 'mariscos', 'mayonesa', 'leche', 'queso', 'mantequilla']):
                continue
        if 'sin_cerdo' in preferencias.get('preferencias_culturales', []):
            if any(ing in ingredientes for ing in ['cerdo', 'chicharrón']):
                continue
        if 'sin_mariscos' in preferencias.get('preferencias_culturales', []):
            if any(ing in ingredientes for ing in ['mariscos', 'pescado', 'calamar', 'pulpo', 'conchas']):
                continue
        # Filtros nutricionales
        cumple_todas = True
        for etiqueta in etiquetas_nutricionales:
            if etiqueta == 'bajo_grasa':
                if platillo.get('calorias', 0) > 300 or 'frito' in platillo.get('descripcion', '').lower():
                    cumple_todas = False
            if etiqueta == 'alto_proteina':
                if not any(ing in ingredientes for ing in ['carne', 'pollo', 'res', 'pato', 'huevo', 'queso', 'lentejas', 'garbanzos', 'pescado']):
                    cumple_todas = False
            if etiqueta == 'sin_gluten':
                if any(ing in ingredientes for ing in ['trigo', 'pan', 'fideos', 'pasta', 'harina']):
                    cumple_todas = False
            if etiqueta == 'vegano':
                if any(ing in ingredientes for ing in ['pollo', 'carne', 'res', 'cerdo', 'pato', 'chicharrón', 'huevo', 'pescado', 'mariscos', 'mayonesa', 'leche', 'queso', 'mantequilla']):
                    cumple_todas = False
        if not cumple_todas:
            continue
        # Filtro de presupuesto
        if platillo.get('precio', 0) > presupuesto:
            continue
        resultados.append(platillo)
    return resultados

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/platillos")
def get_platillos():
    with open('platillos.json', 'r', encoding='utf-8') as f:
        platillos = json.load(f)
    return {"platillos": platillos}

@app.post("/api/recomendar")
async def api_recomendar(request: Request):
    data = await request.json()
    recomendaciones = recomendar_platillos(data)
    return {"recomendaciones": recomendaciones} 