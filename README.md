# Local Three-Tier Kubernetes Stack

A local three-tier application deployed on Kubernetes using Minikube, F5 NGINX Ingress Controller, a frontend, a Node.js backend, and PostgreSQL. The project includes HTTPS, health checks, Kubernetes configuration, and persistent storage.

## Architecture

<img width="1671" height="941" alt="mini-project" src="https://github.com/user-attachments/assets/22890e0d-d1ee-49a8-99a9-e8a4f669822e" />


## Request Flow

1. Open the application using your configured domain name.
2. F5 NGINX Ingress Controller receives the HTTP/HTTPS request.
3. Ingress routes traffic to the frontend or backend Service according to the configured rules.
4. The backend handles health checks and database requests.
5. PostgreSQL stores the application data.
6. The dashboard displays frontend, backend, and database status.

## Run Locally

### 1. Start Minikube

```bash
minikube start
minikube status
kubectl get nodes
```

### 2. Build and Load the Images

Run these commands from the project root:

```bash
docker build -t stack-frontend:v1 ./frontend
docker build -t stack-backend:v2 ./backend

minikube image load stack-frontend:v1
minikube image load stack-backend:v2
```

Ensure the image tags match those configured in your Kubernetes Deployment manifests.

### 3. Apply the Kubernetes Manifests

```bash
kubectl apply -f k8s/configmap.yml -f k8s/secret.yml
kubectl apply -f k8s/rbac.yml
kubectl apply -f k8s/cert-manager.yml
kubectl apply -f k8s/postgres-deployment.yml
kubectl apply -f k8s/backend-deployment.yml -f k8s/frontend-deployment.yml
kubectl apply -f k8s/ingress.yml
```

**Note:** The `cert-manager.yml` manifest configures certificate resources; it does not necessarily install cert-manager itself. Install the cert-manager controller separately if your cluster does not already have it.

### 4. Verify the Deployments and Ingress

```bash
kubectl get pods,svc,ingress
kubectl get svc -A
kubectl rollout status deployment/frontend-deployment
kubectl rollout status deployment/backend-deployment
kubectl rollout status deployment/postgres-deployment
```

Find the Ingress Controller Service and identify its HTTPS NodePort from the `443:<HTTPS_NODEPORT>/TCP` entry.

### 5. Configure Your Domain Name

Choose a local domain name, for example `app.local`. You can use another domain name, but it must match the hostname configured in `k8s/ingress.yml` and the hostname you enter in your browser.

First, get the current Minikube IP:

```bash
minikube ip
```

Set the values below. Replace the text inside angle brackets with your chosen values:

```bash
MINIKUBE_IP="<MINIKUBE_IP>"
DOMAIN_NAME="<DOMAIN_NAME>"
```

For example, `<MINIKUBE_IP>` is the address returned by `minikube ip`, and `<DOMAIN_NAME>` could be `app.local`.

Add the mapping to `/etc/hosts`:

```bash
echo "$MINIKUBE_IP $DOMAIN_NAME" | sudo tee -a /etc/hosts
```

This maps your chosen domain name to the Minikube IP on the machine where you run the command. If you use a different domain, update the hostname in `k8s/ingress.yml` to match it and reapply the manifest:

```bash
kubectl apply -f k8s/ingress.yml
```

If you change the Minikube IP later, update the `/etc/hosts` entry as well.

### 6. Open the Application

Set the HTTPS NodePort you found in Step 4:

```bash
HTTPS_NODEPORT="<HTTPS_NODEPORT>"
```

Open the application at:

```text
https://<DOMAIN_NAME>:<HTTPS_NODEPORT>/
```

Replace both placeholders with your configured domain and HTTPS NodePort.

Because this project uses a self-signed TLS certificate, your browser may display a certificate warning during local development.

### 7. Test the Backend Endpoints

```bash
curl -k "https://<DOMAIN_NAME>:<HTTPS_NODEPORT>/api/health"
curl -k "https://<DOMAIN_NAME>:<HTTPS_NODEPORT>/api/db-check"
```

Replace the placeholders before running the commands. The `-k` option skips certificate verification for the local self-signed certificate; it is not recommended for normal production use.

## Troubleshooting Highlights

* **Backend changes not appearing:** Rebuild the image, load it into Minikube, update the Deployment image tag if needed, wait for rollout, and verify the running Pod.
* **Ingress not reachable:** Check the Ingress Controller Service, HTTPS NodePort, Minikube IP, and `/etc/hosts` mapping.
* **Health checks failing:** Ensure Deployment probes use the backend's actual health endpoint, `/api/health`.
* **Wrong page or API response:** Test through the configured Ingress URL rather than an unrelated IDE preview address.

## Security Notes

* This setup is intended for local development, not production deployment.
* The TLS certificate is self-signed.
* Kubernetes Secret values encoded in Base64 are not encrypted by Base64 itself.
* The Minikube IP and assigned NodePorts may change; check their current values instead of assuming they remain fixed.
* Keep credentials and other sensitive values out of public repositories.
