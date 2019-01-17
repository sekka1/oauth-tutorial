Deployment Usage
=================

# Launching
```
helm template --name slack-oauth --namespace dev-k8sbot --values values.yaml --values values-dev.yaml ./ > /tmp/output.yaml
kubectl -n dev-k8sbot apply -f /tmp/output.yaml
```

# cert-manager and Kong
If using the helm cert-manger, additional Kong configuration will be needed.

By default Kong does not forward the hostname to the final destination.  

The cert-manager http solver checks for this and will not return a HTTP 200 if the
host header does not match the hostname:

```
2019/01/17 03:54:18 [slack-oauth.dev.managedkube.com] Validating request. basePath=/.well-known/acme-challenge, token=xYMunvgTs_dOdfxnNvJt6iriROMccq8U8C6LSnsV7hw
2019/01/17 03:54:18 [10.44.1.10] Comparing actual host '10.44.1.10' against expected 'slack-oauth.dev.managedkube.com'
2019/01/17 03:54:18 [slack-oauth.dev.managedkube.com] Invalid host '10.44.1.10'
```

The workaround to this is to set the Kong flag to `preserve_host`.  This means that
you have to launch the `./kong/ingress.yaml` resource and place the annotations
on the ingress: `configuration.konghq.com: slack-oauth-ingress-cert-manager`.  This
will tell Kong to use this configuration.
