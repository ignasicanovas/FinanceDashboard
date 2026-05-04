#!/bin/bash
# deploy.sh — Despliegue de FinanceDashboard en GCP Cloud Run
# Uso: ./deploy.sh [PROJECT_ID] [REGION]
set -e

PROJECT_ID="${1:-$(gcloud config get-value project)}"
REGION="${2:-europe-west1}"
BACKEND_SERVICE="finanzas-backend"
FRONTEND_SERVICE="finanzas-frontend"
GCS_BUCKET="finanzas-n26-data"
SA_NAME="finanzas-sa"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SECRET_NAME="finanzas-secret-key"

echo "========================================"
echo "Proyecto: $PROJECT_ID"
echo "Región:   $REGION"
echo "========================================"

# 1. Configurar proyecto
gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com storage.googleapis.com secretmanager.googleapis.com

# 2. Service Account
if ! gcloud iam service-accounts describe "$SA_EMAIL" &>/dev/null; then
  echo "Creando Service Account..."
  gcloud iam service-accounts create "$SA_NAME" --display-name="FinanceDashboard SA"
fi

# Permisos GCS
gcloud storage buckets add-iam-policy-binding "gs://${GCS_BUCKET}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.objectAdmin" 2>/dev/null || true

# Permisos Secret Manager
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" 2>/dev/null || true

# 3. Crear Secret para JWT si no existe
if ! gcloud secrets describe "$SECRET_NAME" &>/dev/null; then
  echo "Creando secret JWT..."
  openssl rand -hex 32 | gcloud secrets create "$SECRET_NAME" --data-file=-
fi

# 4. Deploy backend
echo ""
echo "Desplegando backend..."
gcloud run deploy "$BACKEND_SERVICE" \
  --source ./backend \
  --region "$REGION" \
  --service-account "$SA_EMAIL" \
  --set-secrets "SECRET_KEY=${SECRET_NAME}:latest" \
  --set-env-vars "GCS_BUCKET=${GCS_BUCKET},APP_ENV=production" \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5

BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" \
  --region "$REGION" --format="value(status.url)")
echo "Backend URL: $BACKEND_URL"

# 5. Actualizar CORS en backend con la URL del frontend (se hace después)
# Por ahora ponemos el backend URL para que el frontend pueda conectarse

# 6. Deploy frontend
echo ""
echo "Desplegando frontend..."
gcloud run deploy "$FRONTEND_SERVICE" \
  --source ./frontend \
  --region "$REGION" \
  --set-env-vars "BACKEND_URL=${BACKEND_URL}" \
  --allow-unauthenticated \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5

FRONTEND_URL=$(gcloud run services describe "$FRONTEND_SERVICE" \
  --region "$REGION" --format="value(status.url)")
echo "Frontend URL: $FRONTEND_URL"

# 7. Actualizar CORS del backend con la URL real del frontend
echo ""
echo "Actualizando CORS del backend..."
gcloud run services update "$BACKEND_SERVICE" \
  --region "$REGION" \
  --set-env-vars "GCS_BUCKET=${GCS_BUCKET},APP_ENV=production,ALLOWED_ORIGINS=[\"${FRONTEND_URL}\"]"

echo ""
echo "========================================"
echo "Despliegue completado!"
echo "Frontend: $FRONTEND_URL"
echo "Backend:  $BACKEND_URL"
echo "API docs: ${BACKEND_URL}/docs  (solo en dev)"
echo "========================================"
