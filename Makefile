DOCKER_TAG?=dev

build:
	docker build -t garland/k8sbot-oauth:${DOCKER_TAG} .

push:
	docker push garland/k8sbot-oauth:${DOCKER_TAG}
