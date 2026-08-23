$version: "2"

metadata shapeClosures = [
    {
        id: "example.weather#weatherTypes"
        includeNamespaces: ["example.weather"]
    }
]

namespace example.weather

use aws.protocols#restJson1

@restJson1
service Weather {
    version: "2026-08-23"
    operations: [GetCity, UpdateCity]
}

@readonly
@http(method: "GET", uri: "/cities/{cityId}", code: 200)
operation GetCity {
    input := {
        @required
        @httpLabel
        cityId: String
    }

    output: City
}

@idempotent
@http(method: "PUT", uri: "/cities/{cityId}", code: 200)
operation UpdateCity {
    input := {
        @required
        @httpLabel
        cityId: String

        @required
        temperatureCelsius: Float
    }

    output: City
}

structure City {
    @required
    name: String

    @required
    temperatureCelsius: Float

    humidityPercent: Float

    windSpeedKph: Float
}
