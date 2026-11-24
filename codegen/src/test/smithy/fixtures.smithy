$version: "2"

namespace example.fixtures

use aws.protocols#restJson1

/// Queries and mutations, with more than one of each.
@restJson1
service Catalog {
    version: "2026-11-14"
    operations: [GetItem, ListItems, CreateItem, DeleteItem]
}

/// Queries only, so no mutation imports or helpers may be emitted.
@restJson1
service Reports {
    version: "2026-11-14"
    operations: [GetReport]
}

/// Mutations only, so no query imports or helpers may be emitted.
@restJson1
service Commands {
    version: "2026-11-14"
    operations: [RunCommand]
}

@readonly
@http(method: "GET", uri: "/items/{itemId}", code: 200)
operation GetItem {
    input := {
        @required
        @httpLabel
        itemId: String
    }

    output := {
        @required
        name: String
    }
}

@readonly
@http(method: "GET", uri: "/items", code: 200)
operation ListItems {
    input := {
        @httpQuery("prefix")
        prefix: String
    }

    output := {
        @required
        names: Names
    }
}

@http(method: "POST", uri: "/items", code: 201)
operation CreateItem {
    input := {
        @required
        name: String
    }

    output := {
        @required
        itemId: String
    }
}

@idempotent
@http(method: "DELETE", uri: "/items/{itemId}", code: 204)
operation DeleteItem {
    input := {
        @required
        @httpLabel
        itemId: String
    }

    output := {}
}

@readonly
@http(method: "GET", uri: "/reports/{reportId}", code: 200)
operation GetReport {
    input := {
        @required
        @httpLabel
        reportId: String
    }

    output := {
        @required
        title: String
    }
}

@http(method: "POST", uri: "/commands", code: 200)
operation RunCommand {
    input := {
        @required
        command: String
    }

    output := {
        @required
        exitCode: Integer
    }
}

list Names {
    member: String
}
