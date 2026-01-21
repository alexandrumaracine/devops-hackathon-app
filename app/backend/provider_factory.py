import os

from weather_provider import (
    OpenWeatherProvider,
    DeterministicMockWeatherProvider,
)


def get_weather_provider():
    """
    Single place where runtime behavior is selected.

    Default:
      - production behavior (real OpenWeather calls)

    When LOAD_TEST=true:
      - deterministic, CPU-only mock responses
    """
    load_test_enabled = os.getenv("LOAD_TEST", "false").lower() == "true"

    if load_test_enabled:
        seed = int(os.getenv("LOAD_TEST_SEED", "42"))
        print(f"⚙️  LOAD_TEST enabled → using mock weather provider (seed={seed})")
        return DeterministicMockWeatherProvider(seed=seed)

    print("🌍 Production mode → using OpenWeather provider")
    return OpenWeatherProvider()
