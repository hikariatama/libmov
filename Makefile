.PHONY: dev build landing

dev:
	$(MAKE) -C app dev

build:
	$(MAKE) -C app build PLATFORM=$(PLATFORM) ARCH=$(ARCH) TARGET=$(TARGET) PUBLISH=$(PUBLISH)

landing:
	python3 -m http.server 4238 --directory landing
