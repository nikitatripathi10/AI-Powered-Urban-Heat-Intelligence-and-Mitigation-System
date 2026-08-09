import os
from pathlib import Path

# Directory where ML pipeline writes its JSON outputs.
# Override via ML_OUTPUTS_DIR env var (useful in Docker).
ML_OUTPUTS_DIR: Path = Path(
    os.getenv(
        "ML_OUTPUTS_DIR",
        str(Path(__file__).parent.parent / "AI" / "urban-heat-aiml" / "outputs"),
    )
)
