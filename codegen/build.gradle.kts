import com.vanniktech.maven.publish.JavaLibrary
import com.vanniktech.maven.publish.JavadocJar
import com.vanniktech.maven.publish.SonatypeHost

plugins {
    `java-library`
    `maven-publish`
    id("com.vanniktech.maven.publish") version "0.30.0"
}

group = "io.github.thomaslaich.smithyvite"
version = (findProperty("version") as String?).takeUnless {
    it.isNullOrBlank() || it == "unspecified"
} ?: "0.0.1-spike"

repositories {
    mavenCentral()
}

dependencies {
    compileOnly("software.amazon.smithy.typescript:smithy-typescript-codegen:0.52.0")
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

tasks.withType<JavaCompile>().configureEach {
    options.release = 17
}

publishing {
    repositories {
        maven {
            name = "spike"
            url = uri(layout.projectDirectory.dir("../packages/codegen/vendor/maven"))
        }
    }
}

mavenPublishing {
    publishToMavenCentral(SonatypeHost.CENTRAL_PORTAL)
    if (providers.environmentVariable("ORG_GRADLE_PROJECT_signingInMemoryKey").isPresent) {
        signAllPublications()
    }

    configure(JavaLibrary(javadocJar = JavadocJar.Empty(), sourcesJar = true))
    coordinates(group.toString(), "smithy-vite-codegen", version.toString())

    pom {
        name.set("Smithy Vite TypeScript Integration")
        description.set("Smithy TypeScript integration that generates framework-native TanStack Query bindings for smithy-vite.")
        url.set("https://github.com/thomaslaich/smithy-vite")
        inceptionYear.set("2026")
        licenses {
            license {
                name.set("Apache License, Version 2.0")
                url.set("https://www.apache.org/licenses/LICENSE-2.0")
                distribution.set("repo")
            }
        }
        developers {
            developer {
                id.set("thomaslaich")
                name.set("Thomas Laich")
                url.set("https://github.com/thomaslaich")
            }
        }
        scm {
            url.set("https://github.com/thomaslaich/smithy-vite")
            connection.set("scm:git:git://github.com/thomaslaich/smithy-vite.git")
            developerConnection.set("scm:git:ssh://git@github.com/thomaslaich/smithy-vite.git")
        }
    }
}
