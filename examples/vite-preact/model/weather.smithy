$version: "2"

namespace example.weather

use aws.protocols#restJson1

@restJson1
service Weather {
    version: "2026-08-22"
    operations: [GetCity]
}

@readonly
@http(method: "GET", uri: "/cities/{cityId}", code: 200)
operation GetCity {
    input := {
        @required
        @httpLabel
        cityId: String
    }

    output := {
        @required
        name: String

        @required
        temperatureCelsius: Float

        humidityPercent: Float

        windSpeedKph: Float
    }
}
