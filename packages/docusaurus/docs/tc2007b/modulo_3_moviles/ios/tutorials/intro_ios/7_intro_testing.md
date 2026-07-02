# 7 - Introducción a Testing

## Objetivo

En este laboratorio aprenderemos sobre el entorno de pruebas de Xcode en las aplicaciones de iOS, implementación de pruebas unitarias, de interfaz, ejecución de las mismas y por último como obtener el code coverage de nuestro desarrollo.

Para este laboratorio vamos a continuar el desarrollo del Pokedex que hemos venido realizando hasta ahora.

**Nota: Al final de este laboratorio te recomiendo que generes una copia para que en los próximos tengas un punto de comparación sobre lo que se va avanzando.**

## Instrucciones

Sigue los pasos descritos en la siguiente práctica, si tienes algún problema no olvides que tus profesores están para apoyarte.

## API
Para este laboratorio estaremos utilizando el API de [PokeAPI](https://pokeapi.co/) los endpoints con los que trabajamos son:

```
GET https://pokeapi.co/api/v2/pokemon/?limit=1279
GET https://pokeapi.co/api/v2/pokemon/{number_pokemon}/
```

## Laboratorio

### Paso 1: Introducción al Testing en iOS

El testing es una parte fundamental del desarrollo de aplicaciones modernas. En iOS, Xcode nos proporciona un framework robusto para escribir y ejecutar diferentes tipos de pruebas:

1. **Unit Tests (Pruebas Unitarias)**: Prueban componentes individuales de forma aislada
2. **Integration Tests (Pruebas de Integración)**: Prueban la interacción entre múltiples componentes
3. **UI Tests (Pruebas de Interfaz)**: Prueban la aplicación desde la perspectiva del usuario

En nuestro proyecto Pokedex, tenemos la siguiente arquitectura que debemos probar:

- **Models**: Pokemon, Pokedex, PokemonBase
- **ViewModels**: PokemonViewModel
- **Services**: PokemonAPIService, PokemonRepository
- **Views**: ContentView, LoginView

### Paso 2: Configuración del Entorno de Testing

Antes de escribir nuestras pruebas, vamos a verificar que nuestro proyecto tenga las carpetas de testing configuradas correctamente:

1. **PokedexTests**: Para pruebas unitarias y de integración
2. **PokedexUITests**: Para pruebas de interfaz

Si no las tienes, puedes agregarlas:
1. En Xcode, clic derecho en el proyecto → New → Target
2. Selecciona "Unit Testing Bundle" o "UI Testing Bundle"
3. Configura el nombre como "PokedexTests" o "PokedexUITests"

### Paso 3: Unit Testing

#### Testing de Modelos

Vamos a comenzar probando nuestros modelos de datos. Crea un nuevo archivo en `PokedexTests` llamado `PokemonModelTests.swift`:

```swift
import XCTest
@testable import Pokedex

final class PokemonModelTests: XCTestCase {
    
    func testPokemonInitialization() {
        // Given
        let name = "pikachu"
        let url = "https://pokeapi.co/api/v2/pokemon/25/"
        
        // When
        let pokemon = Pokemon(name: name, url: url)
        
        // Then
        XCTAssertEqual(pokemon.name, name)
        XCTAssertEqual(pokemon.url, url)
    }
    
    func testPokemonBaseInitialization() {
        // Given
        let pokemon = Pokemon(name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon/1/")
        let sprite = Sprite(front_default: "front.png", back_default: "back.png")
        let perfil = Perfil(sprites: sprite)
        let id = 1
        
        // When
        let pokemonBase = PokemonBase(id: id, pokemon: pokemon, perfil: perfil)
        
        // Then
        XCTAssertEqual(pokemonBase.id, id)
        XCTAssertEqual(pokemonBase.pokemon.name, "bulbasaur")
        XCTAssertEqual(pokemonBase.perfil.sprites.front_default, "front.png")
    }
    
    func testPokemonIdentifiable() {
        // Given
        let pokemon = Pokemon(name: "charmander", url: "https://pokeapi.co/api/v2/pokemon/4/")
        let sprite = Sprite(front_default: "", back_default: "")
        let perfil = Perfil(sprites: sprite)
        
        // When
        let pokemonBase1 = PokemonBase(id: 1, pokemon: pokemon, perfil: perfil)
        let pokemonBase2 = PokemonBase(id: 2, pokemon: pokemon, perfil: perfil)
        
        // Then
        XCTAssertNotEqual(pokemonBase1.id, pokemonBase2.id)
    }
}
```

#### Testing del Repository

Ahora vamos a probar nuestro `PokemonRepository`. Crea `PokemonRepositoryTests.swift`:

```swift
import XCTest
@testable import Pokedex

final class PokemonRepositoryTests: XCTestCase {
    var repository: PokemonRepository!
    
    override func setUpWithError() throws {
        repository = PokemonRepository()
    }
    
    override func tearDownWithError() throws {
        repository = nil
    }
    
    func testGetPokemonListSuccess() async throws {
        // When
        let result = await repository.getPokemonList(limit: 10)
        
        // Then
        XCTAssertNotNil(result)
        XCTAssertTrue(result?.results.count ?? 0 > 0)
        XCTAssertEqual(result?.count, 1279) // Total Pokemon count
    }
    
    func testGetPokemonDetailSuccess() async throws {
        // Given
        let pokemonNumber = 1
        
        // When
        let result = await repository.getPokemonDetail(number: pokemonNumber)
        
        // Then
        XCTAssertNotNil(result)
        XCTAssertNotNil(result?.sprites.front_default)
    }
    
    func testGetPokemonDetailInvalidNumber() async throws {
        // Given
        let invalidNumber = -1
        
        // When
        let result = await repository.getPokemonDetail(number: invalidNumber)
        
        // Then
        XCTAssertNil(result) // Should return nil for invalid numbers
    }
}
```

#### Testing del ViewModel

Crea `PokemonViewModelTests.swift` para probar la lógica de negocio:

```swift
import XCTest
@testable import Pokedex

final class PokemonViewModelTests: XCTestCase {
    var viewModel: PokemonViewModel!
    
    override func setUpWithError() throws {
        viewModel = PokemonViewModel()
    }
    
    override func tearDownWithError() throws {
        viewModel = nil
    }
    
    func testInitialState() {
        // Then
        XCTAssertTrue(viewModel.pokemonList.isEmpty)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.errorMessage)
    }
    
    func testLoadPokemonListSuccess() async throws {
        // Given
        let expectation = XCTestExpectation(description: "Pokemon list loaded")
        
        // When
        await viewModel.getPokemonList()
        
        // Then
        DispatchQueue.main.async {
            XCTAssertFalse(self.viewModel.pokemonList.isEmpty)
            XCTAssertFalse(self.viewModel.isLoading)
            XCTAssertNil(self.viewModel.errorMessage)
            expectation.fulfill()
        }
        
        await fulfillment(of: [expectation], timeout: 10.0)
    }
    
    func testLoadingState() {
        // Given
        let expectation = XCTestExpectation(description: "Loading state changes")
        
        // When
        Task {
            await viewModel.getPokemonList()
            
            DispatchQueue.main.async {
                expectation.fulfill()
            }
        }
        
        // Then
        XCTAssertTrue(viewModel.isLoading) // Should be loading initially
        
        wait(for: [expectation], timeout: 10.0)
    }
}
```

#### Testing con Mocks

Para hacer pruebas más rápidas y controladas, podemos crear mocks. Crea `MockPokemonRepository.swift`:

```swift
@testable import Pokedex

class MockPokemonRepository: PokemonAPIProtocol {
    var shouldReturnError = false
    var mockPokedex: Pokedex?
    var mockPerfil: Perfil?
    
    func getPokemonList(limit: Int) async -> Pokedex? {
        if shouldReturnError {
            return nil
        }
        
        return mockPokedex ?? Pokedex(
            count: 1279,
            results: [
                Pokemon(name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon/1/"),
                Pokemon(name: "ivysaur", url: "https://pokeapi.co/api/v2/pokemon/2/")
            ]
        )
    }
    
    func getPokemonDetail(number: Int) async -> Perfil? {
        if shouldReturnError {
            return nil
        }
        
        return mockPerfil ?? Perfil(
            sprites: Sprite(
                front_default: "https://example.com/front.png",
                back_default: "https://example.com/back.png"
            )
        )
    }
}
```

Y usar este mock en nuestras pruebas:

```swift
final class PokemonViewModelMockTests: XCTestCase {
    var viewModel: PokemonViewModel!
    var mockRepository: MockPokemonRepository!
    
    override func setUpWithError() throws {
        mockRepository = MockPokemonRepository()
        viewModel = PokemonViewModel()
        // Aquí necesitarías inyectar el mock repository en el viewModel
    }
    
    func testLoadPokemonListWithMock() async throws {
        // Given
        mockRepository.shouldReturnError = false
        
        // When
        await viewModel.getPokemonList()
        
        // Then
        XCTAssertEqual(viewModel.pokemonList.count, 2)
        XCTAssertEqual(viewModel.pokemonList.first?.pokemon.name, "bulbasaur")
    }
    
    func testLoadPokemonListError() async throws {
        // Given
        mockRepository.shouldReturnError = true
        
        // When
        await viewModel.getPokemonList()
        
        // Then
        XCTAssertTrue(viewModel.pokemonList.isEmpty)
        XCTAssertNotNil(viewModel.errorMessage)
    }
}
```

### Paso 4: User Interface Testing

Las pruebas de UI verifican que la interfaz funcione correctamente desde la perspectiva del usuario. Crea `PokedexUITests.swift` en la carpeta `PokedexUITests`:

```swift
import XCTest

final class PokedexUITests: XCTestCase {
    var app: XCUIApplication!
    
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }
    
    override func tearDownWithError() throws {
        app = nil
    }
    
    func testLoginFlow() throws {
        // Test that login screen appears
        let emailTextField = app.textFields["Correo Electrónico"]
        XCTAssertTrue(emailTextField.exists)
        
        // Test entering email
        emailTextField.tap()
        emailTextField.typeText("test@example.com")
        
        // Test login button
        let loginButton = app.buttons["Acceder"]
        XCTAssertTrue(loginButton.exists)
        loginButton.tap()
        
        // Verify navigation to pokemon list
        let pokemonList = app.tables.firstMatch
        XCTAssertTrue(pokemonList.waitForExistence(timeout: 5.0))
    }
    
    func testPokemonListDisplays() throws {
        // Skip login if already logged in
        loginIfNeeded()
        
        // Wait for pokemon list to load
        let pokemonList = app.tables.firstMatch
        XCTAssertTrue(pokemonList.waitForExistence(timeout: 10.0))
        
        // Check that list has items
        let firstCell = pokemonList.cells.firstMatch
        XCTAssertTrue(firstCell.waitForExistence(timeout: 5.0))
        
        // Verify cell contains pokemon name
        XCTAssertTrue(firstCell.staticTexts.count > 0)
    }
    
    func testPokemonDetailNavigation() throws {
        // Navigate to pokemon list
        loginIfNeeded()
        
        let pokemonList = app.tables.firstMatch
        XCTAssertTrue(pokemonList.waitForExistence(timeout: 10.0))
        
        // Tap on first pokemon
        let firstCell = pokemonList.cells.firstMatch
        XCTAssertTrue(firstCell.waitForExistence(timeout: 5.0))
        firstCell.tap()
        
        // Verify detail view appears
        // (This depends on your detail view implementation)
        let backButton = app.navigationBars.buttons.firstMatch
        XCTAssertTrue(backButton.waitForExistence(timeout: 5.0))
    }
    
    func testPullToRefresh() throws {
        loginIfNeeded()
        
        let pokemonList = app.tables.firstMatch
        XCTAssertTrue(pokemonList.waitForExistence(timeout: 10.0))
        
        // Perform pull to refresh
        let firstCell = pokemonList.cells.firstMatch
        let start = firstCell.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        let finish = firstCell.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 6))
        start.press(forDuration: 0.1, thenDragTo: finish)
        
        // Verify list refreshes (you might check for loading indicator)
        XCTAssertTrue(pokemonList.exists)
    }
    
    // Helper method
    private func loginIfNeeded() {
        let emailTextField = app.textFields["Correo Electrónico"]
        if emailTextField.exists {
            emailTextField.tap()
            emailTextField.typeText("test@example.com")
            app.buttons["Acceder"].tap()
        }
    }
}
```

#### UI Testing para Accessibility

También podemos probar la accesibilidad:

```swift
func testAccessibility() throws {
    loginIfNeeded()
    
    let pokemonList = app.tables.firstMatch
    XCTAssertTrue(pokemonList.waitForExistence(timeout: 10.0))
    
    // Test VoiceOver labels
    let firstCell = pokemonList.cells.firstMatch
    XCTAssertTrue(firstCell.waitForExistence(timeout: 5.0))
    
    // Verify accessibility label exists
    XCTAssertNotNil(firstCell.label)
    XCTAssertFalse(firstCell.label.isEmpty)
}
```

### Paso 5: Ejecución de las pruebas

Para este laboratorio es ampliamente recomendable tener un dispositivo iOS conectado con Xcode, ya que correr las pruebas con simulador ocupa mucha... mucha... mucha... RAM y puede x_x tu computadora.

#### Ejecutar pruebas unitarias:

1. **Desde Xcode**:
   - Presiona `Cmd + U` para ejecutar todas las pruebas
   - O clic en el diamante al lado de cada función de prueba
   - Usa `Cmd + Ctrl + U` para ejecutar pruebas en dispositivo

2. **Desde Terminal**:
```bash
# Ejecutar todas las pruebas
xcodebuild test -project Pokedex.xcodeproj -scheme Pokedex -destination 'platform=iOS Simulator,name=iPhone 14'

# Ejecutar solo pruebas unitarias
xcodebuild test -project Pokedex.xcodeproj -scheme Pokedex -destination 'platform=iOS Simulator,name=iPhone 14' -only-testing:PokedexTests

# Ejecutar solo pruebas de UI
xcodebuild test -project Pokedex.xcodeproj -scheme Pokedex -destination 'platform=iOS Simulator,name=iPhone 14' -only-testing:PokedexUITests
```

#### Configurar esquemas de prueba:

1. En Xcode, ve a Product → Scheme → Edit Scheme
2. Selecciona la pestaña "Test"
3. Asegúrate de que tus targets de prueba estén habilitados
4. Configura argumentos de entorno si es necesario

#### Best practices para ejecución:

- **Dispositivo físico**: Siempre prefiere dispositivo físico para UI tests
- **Paralelización**: Habilita "Execute in parallel" en el scheme para pruebas unitarias
- **Order**: Asegúrate de que las pruebas puedan ejecutarse en cualquier orden
- **Cleanup**: Limpia el estado entre pruebas usando `setUp` y `tearDown`

### Paso 6: Code Coverage

El code coverage nos ayuda a identificar qué partes de nuestro código están siendo probadas.

#### Habilitar Code Coverage en Xcode:

1. Ve a Product → Scheme → Edit Scheme
2. Selecciona la pestaña "Test"
3. En "Options", marca "Code Coverage"
4. Selecciona el target que quieres medir

#### Interpretar los resultados:

1. Ejecuta las pruebas con `Cmd + U`
2. Ve a Report Navigator (⌘ + 9)
3. Selecciona el último test report
4. Haz clic en "Coverage" para ver el reporte detallado

#### Métricas importantes:

- **Line Coverage**: Porcentaje de líneas ejecutadas
- **Function Coverage**: Porcentaje de funciones llamadas
- **Branch Coverage**: Porcentaje de ramas de decisión ejecutadas

#### Objetivos de coverage:

- **Modelos**: Apunta a 90-100% (son simples)
- **ViewModels**: Apunta a 80-90% (lógica de negocio crítica)
- **Services**: Apunta a 70-85% (incluye casos edge)
- **Views**: 40-60% (UI testing cubre esto)

#### Generar reportes desde Terminal:

```bash
# Ejecutar con coverage
xcodebuild test -project Pokedex.xcodeproj -scheme Pokedex -destination 'platform=iOS Simulator,name=iPhone 14' -enableCodeCoverage YES

# Exportar reporte de coverage
xcrun xccov view --report --json DerivedData/Pokedex/Logs/Test/*.xcresult > coverage.json
```

#### Análisis del coverage:

```swift
// Ejemplo: Si tienes código no cubierto como este:
func handleError(_ error: Error) {
    if let networkError = error as? NetworkError {
        // Esta línea podría no estar cubierta
        print("Network error: \(networkError)")
    } else {
        // O esta línea
        print("Unknown error: \(error)")
    }
}

// Necesitas agregar pruebas para ambos casos:
func testHandleNetworkError() {
    let networkError = NetworkError.noConnection
    viewModel.handleError(networkError)
    // Verificar comportamiento
}

func testHandleUnknownError() {
    let unknownError = NSError(domain: "test", code: 1)
    viewModel.handleError(unknownError)
    // Verificar comportamiento
}
```

### Paso 7: CI/CD con Testing

Para automatizar las pruebas, puedes crear un script de GitHub Actions:

```yaml
# .github/workflows/ios-tests.yml
name: iOS Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: macos-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Xcode
      uses: maxim-lobanov/setup-xcode@v1
      with:
        xcode-version: latest-stable
    
    - name: Run Unit Tests
      run: |
        xcodebuild test \
          -project Pokedex.xcodeproj \
          -scheme Pokedex \
          -destination 'platform=iOS Simulator,name=iPhone 14' \
          -only-testing:PokedexTests \
          -enableCodeCoverage YES
    
    - name: Run UI Tests
      run: |
        xcodebuild test \
          -project Pokedex.xcodeproj \
          -scheme Pokedex \
          -destination 'platform=iOS Simulator,name=iPhone 14' \
          -only-testing:PokedexUITests
```

### Conclusión

En este laboratorio hemos cubierto:

1. ✅ **Unit Testing**: Pruebas de modelos, repositories y ViewModels
2. ✅ **UI Testing**: Pruebas de flujos de usuario completos
3. ✅ **Mocking**: Creación de mocks para pruebas controladas
4. ✅ **Code Coverage**: Medición y análisis de cobertura
5. ✅ **Best Practices**: Patrones y mejores prácticas para testing
6. ✅ **Automation**: Integración con CI/CD

El testing es fundamental para:
- Detectar bugs temprano
- Facilitar refactoring seguro
- Documentar comportamiento esperado
- Mejorar la calidad del código
- Dar confianza en deploys

**Recuerda**: Las pruebas son código también, manténlas simples, legibles y bien organizadas.



