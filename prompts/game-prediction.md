# Game Prediction Domain Prompt

## Domain Context

VIB AI Agent Platform predicts outcomes for casino/slot-style games. The platform uses:

- Historical game pattern analysis
- Real-time player behavior data
- Model inference (DeepSeek API)

## Key Concepts

| Term | Definition |
|------|------------|
| Prediction Confidence | 0.0–1.0 score indicating model certainty |
| Timeframe | Aggregation window: 24h / 7d / 30d |
| Game Mode | quick (fast inference) vs detailed (full analysis) |
| Player Behavior | Pattern metrics used as prediction features |

## Prediction Pipeline

```
Game Selection → Historical Analysis → Context Assembly
→ Model Inference (DeepSeek) → Confidence Scoring → Output
```

## Constraints

- Predictions are probabilistic, not guaranteed
- Always return confidence alongside prediction
- Game metrics are placeholder until live data pipeline
- The prediction model runs on DeepSeek API (OpenAI-compatible)

## Response Format

Always structure prediction responses as JSON:

```json
{
  "game": "<name>",
  "prediction": "<outcome>",
  "confidence": <0.0-1.0>,
  "factors": ["factor1", "factor2"],
  "timestamp": "<ISO-8601>"
}
```
