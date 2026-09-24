let googleMapsPromise = null;

export function loadGoogleMaps() {
    if (window.google?.maps) {
        return Promise.resolve(window.google.maps);
    }

    if (googleMapsPromise) {
        return googleMapsPromise;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        return Promise.reject(
            new Error(
                "Google Maps API key is not configured."
            )
        );
    }

    googleMapsPromise = new Promise((resolve, reject) => {
        const existingScript = document.querySelector(
            'script[data-google-maps="true"]'
        );

        if (existingScript) {
            existingScript.addEventListener("load", () => {
                resolve(window.google.maps);
            });

            existingScript.addEventListener("error", () => {
                reject(
                    new Error("Failed to load Google Maps.")
                );
            });

            return;
        }

        const script = document.createElement("script");

        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;

        script.async = true;
        script.defer = true;
        script.dataset.googleMaps = "true";

        script.onload = () => {
            if (window.google?.maps) {
                resolve(window.google.maps);
            } else {
                reject(
                    new Error("Google Maps loaded incorrectly.")
                );
            }
        };

        script.onerror = () => {
            reject(
                new Error("Failed to load Google Maps.")
            );
        };

        document.head.appendChild(script);
    });

    return googleMapsPromise;
}