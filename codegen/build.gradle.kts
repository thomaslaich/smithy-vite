plugins {
    `java-library`
    `maven-publish`
}

group = "dev.smithy-react"
version = "0.0.1-spike"

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
    publications {
        create<MavenPublication>("mavenJava") {
            from(components["java"])
        }
    }
    repositories {
        maven {
            name = "spike"
            url = uri(layout.projectDirectory.dir("../packages/codegen/vendor/maven"))
        }
    }
}
