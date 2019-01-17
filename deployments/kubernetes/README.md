Deployment Usage
=================


```
helm template --name slack-oauth --namespace dev-k8sbot --values values.yaml --values values-dev.yaml ./ > /tmp/output.yaml
kubectl -n dev-k8sbot apply -f /tmp/output.yaml
```
