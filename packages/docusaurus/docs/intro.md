---
sidebar_position: 0
---

# TC2005B
Este repositorio esta pensado como centro de información y documentación sobre los temas vistos en clase.

- [HTML](https://img.shields.io/badge/HTML-orange.svg?logo=html5&style=flat)
- [CSS](https://img.shields.io/badge/CSS-red.svg?logo=css3&style=flat)
- [JS](https://img.shields.io/badge/javascript-blue.svg?logo=javascript&style=flat)
- [NodeJS](https://img.shields.io/badge/NodeJS-green.svg?logo=node.js&style=flat)
- [MariaDB](https://img.shields.io/badge/MariaDB-purple.svg?logo=mariadb&style=flat)
- [Git](https://img.shields.io/badge/Git-black.svg?logo=git&style=flat)


## ¿Cómo esta organizada la documentación?

[Tutoriales](#) - te toman de la mano a través de una serie de pasos para crear un proyecto o entender un tema completo. Inicia aquí si eres nuevo al tema que estás buscando.

Guías por Tema - discuten temas clave o particulares y conceptos a un alto nivel y proveen información de trasfondo y explicación.

[Guías de Referencia](#) - contienen referencias técnicas para el tema revisado. Describen como funciona y como usarlo pero asumen que tienes un conocimiento básico de entendimiento para los conceptos clave.

[Guías How-To son recetas](#) - Te guían a través de pasos para resolver problemas concretos y casos de uso. Son más avanzados que los tutoriales y asumen que tienes conocimiento del tema buscado.

## Recomendaciones

### Git para el día a día

Sigue la convención de ramas que vayas estableciendo en tus equipos de trabajo, una vez que la tengas te recomiendo la siguiente convención de comandos para un día de trabajo.

#### Al inicio del día o al iniciar trabajo
```
git checkout //Bajar los nuevos branches remotos
git pull origin
```
### Al empezar el día
```
git pull origin
```

### Al empezar una nueva funcionalidad
```
git pull origin
git checkout -b {{nombre-rama}}
```

#### Al final del día o terminar trabajo
```
git pull origin
git add -A
git commit -m "Mensaje significativo de lo que incluye el commit"
git push origin
```

### Eliminar branches locales que ya no existan en el repo remoto
```
git fetch
git remote prune origin
git branch | grep -v "main" | xargs git branch -D
```
