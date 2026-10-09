# Local Three-Tier Kubernetes Stack

A local Kubernetes project demonstrating communication between a frontend dashboard, a Node.js/Express backend, and PostgreSQL using Minikube, F5 NGINX Ingress, and HTTPS.

## Architecture

<!-- Place the generated architecture diagram at docs/architecture.png -->

![Local Three-Tier Kubernetes Architecture](docs/architecture.png)

*Local development environment using self-signed TLS.*

## Request Flow

1. The browser opens the dashboard through the local Ingress endpoint.
2. F5 NGINX handles HTTPS and routes traffic to the frontend or backend Service.
3. The dashboard calls `/api/health` and `/api/db-check`.
4. The backend Service routes API requests to one of the backend Pods.
5. The backend queries PostgreSQL through `postgres-service`.
6. The dashboard displays service health and visualizes requests reaching the backend replicas.

## Run Locally

The F5 NGINX Ingress Controller and cert-manager must already be installed in Minikube.

### 1. Start Minikube

```bash
minikube start
minikube status
kubectl get nodes
```

### 2. Build and load the images

Run these commands from the project root:

```bash
docker build -t stack-frontend:v1 ./frontend
docker build -t stack-backend:v2 ./backend

minikube image load stack-frontend:v1
minikube image load stack-backend:v2
```

Ensure the Kubernetes Deployments reference the matching image tags.

### 3. Apply the Kubernetes manifests

```bash
kubectl apply -f k8s/configmap.yml -f k8s/secret.yml
kubectl apply -f k8s/rbac.yml
kubectl apply -f k8s/cert-manager.yml
kubectl apply -f k8s/postgres-deployment.yml
kubectl apply -f k8s/backend-deployment.yml -f k8s/frontend-deployment.yml
kubectl apply -f k8s/ingress.yml
```

The cert-manager manifest configures the certificate issuer; it does not install cert-manager itself.

### 4. Configure local hostname resolution

Get the current Minikube IP:

```bash
minikube ip
```

Map `app.local` to that IP in the WSL `/etc/hosts` file. For example:

```text
192.168.49.2 app.local
```

Use the actual IP returned by your cluster.

### 5. Verify deployments and services

```bash
kubectl get pods,svc,ingress

kubectl rollout status deployment/frontend-deployment
kubectl rollout status deployment/backend-deployment
kubectl rollout status deployment/postgres-deployment
```

Check the current HTTPS NodePort on the Ingress controller:

```bash
kubectl get svc nginx-ingress-controller-controller
```

### 6. Open and test the application

Open the dashboard in Firefox inside WSL:

`https://app.local:30627/`

Use the current HTTPS NodePort if it differs from `30627`.

Test backend health:

```bash
curl -k https://app.local:30627/api/health
```

Test PostgreSQL connectivity through the backend:

```bash
curl -k https://app.local:30627/api/db-check
```

Expected results:

* `/api/health` returns `status: "ok"`.
* `/api/db-check` returns `status: "connected"` with database details.
* The dashboard shows the frontend and backend as operational and PostgreSQL as connected.

The `-k` option skips TLS certificate verification for local testing with a self-signed certificate. Do not use it as a production security setting.

## Troubleshooting Highlights

* **Backend image and runtime mismatch:** Pods continued serving old code after a rebuild. Built `stack-backend:v2`, loaded it into Minikube, updated the Deployment, waited for rollout completion, and verified the running routes.
* **Ingress networking:** The LoadBalancer/tunnel access method was unreliable in this WSL/Minikube setup. Switched to the Minikube IP and NodePort, then verified HTTPS access.
* **Health probe alignment:** Aligned liveness and readiness probes with the backend's actual `/api/health` endpoint.
* **Frontend preview mismatch:** The IDE preview used a different local address, so relative API requests did not reach the Kubernetes-hosted backend. Opened the actual Ingress endpoint in Firefox inside WSL.

## Security Notes

* This is a local development project, not a public production deployment.
* TLS uses a self-signed certificate.
* `app.local` is a local hostname, not a publicly registered domain.
* Keep the real `k8s/secret.yml` out of Git. Base64 encoding does not encrypt credentials.
* Minikube IPs and NodePorts may differ between environments.
