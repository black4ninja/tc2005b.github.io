---
sidebar_position: 13
---
# Revisiones de Código (Code Reviews)

En los laboratorios anteriores hemos trabajado con Git, ramas y Pull Requests. Ya sabes cómo crear un PR y pedir que alguien revise tu código antes de integrarlo. Ahora vamos a profundizar en la parte más importante de ese proceso: **la revisión de código en sí**.

Un code review no es solo dar clic en "Approve". Es una de las prácticas más valiosas en el desarrollo de software profesional. Bien hecho, mejora la calidad del código, transfiere conocimiento entre el equipo y previene bugs antes de que lleguen a producción. Mal hecho, se convierte en una fuente de conflicto, frustración y toxicidad.

Este laboratorio te dará las herramientas para hacer revisiones que realmente aporten valor, y para recibir retroalimentación sin tomártela personal.

## ¿Por qué hacer code reviews?

Antes de ver el cómo, entendamos el por qué. Estas son las razones principales:

1. **Encontrar defectos temprano.** Un bug encontrado en un code review cuesta mucho menos que uno encontrado en producción. Otro par de ojos detecta problemas que el autor no ve porque ya está "casado" con su solución.

2. **Compartir conocimiento.** Cuando revisas código de alguien más, aprendes cómo resolvió un problema. Cuando alguien revisa tu código, aprendes formas diferentes de pensar. Con el tiempo, todo el equipo entiende todo el proyecto.

3. **Mantener la consistencia.** Un equipo que revisa su código tiende a escribir código más uniforme. Esto hace que el proyecto sea más fácil de mantener a largo plazo.

4. **Mejorar como desarrollador.** Tanto el autor como el revisor mejoran sus habilidades. El autor aprende mejores prácticas, y el revisor practica leer y entender código ajeno, que es una habilidad fundamental.

## La mentalidad correcta

Esta es la parte más importante del laboratorio. La diferencia entre un code review útil y uno tóxico no está en los conocimientos técnicos, sino en la **mentalidad**.

### Se revisa el código, no a la persona

Este es el principio fundamental. Cuando dejas un comentario, estás hablando del código, no del desarrollador que lo escribió. Y cuando recibes un comentario, están hablando de tu código, no de ti.

Parece obvio, pero en la práctica es fácil olvidarlo. Cuando llevas horas trabajando en algo y alguien señala un problema, la reacción natural es sentirte atacado. Es humano. Pero debes entrenarte para separar tu identidad de tu código.

### Todos estamos aprendiendo

No importa si llevas 10 años programando o 10 semanas. Todos tenemos puntos ciegos. El desarrollador más senior del equipo también se beneficia de que alguien revise su código. Un code review no es un examen donde el revisor es el maestro y el autor es el alumno. Es una conversación entre compañeros.

### El objetivo es mejorar el código, no demostrar quién sabe más

Si el código funciona, es legible y cumple con los requisitos, está bien. No necesitas buscar algo que criticar solo porque eres el revisor. Y si encuentras algo que mejorar, tu trabajo es explicar **por qué** y **cómo**, no solo señalar que está mal.

## Cómo dar retroalimentación constructiva

Veamos ejemplos concretos. La diferencia entre un comentario constructivo y uno tóxico a veces es solo cuestión de cómo lo escribes.

### Comentarios que NO debes hacer

```
❌ "Esto está mal."
❌ "¿Por qué hiciste esto así?"
❌ "Esto no tiene sentido."
❌ "Deberías saber que esto no se hace así."
❌ "Otra vez el mismo error..."
```

Estos comentarios tienen algo en común: no explican nada, no proponen una solución y algunos atacan directamente a la persona. No importa si técnicamente tienes razón, si lo comunicas así, el autor se va a poner a la defensiva y no va a aprender nada.

### Comentarios constructivos

```
✅ "Esta consulta podría ser más eficiente si usamos un índice 
    en el campo 'email'. Aquí hay un ejemplo: [link]"

✅ "¿Qué te parece si extraemos esta lógica a una función 
    separada? Así sería más fácil de probar y reutilizar."

✅ "Nota: este endpoint no valida que el usuario esté 
    autenticado. Podríamos agregar el middleware de auth 
    como en la ruta de /usuarios."

✅ "Me gusta cómo resolviste esto. Una sugerencia menor: 
    podríamos usar destructuring aquí para que quede 
    más limpio."

✅ "No conocía esta forma de hacerlo, interesante. 
    ¿Podrías agregar un comentario explicando el por qué? 
    Para que el siguiente que lea el código entienda 
    la decisión."
```

### La fórmula para un buen comentario

Un comentario de code review efectivo tiene estas partes:

1. **Qué observas:** describe el problema o la oportunidad de mejora.
2. **Por qué importa:** explica el impacto (seguridad, rendimiento, legibilidad, mantenimiento).
3. **Qué propones:** sugiere una solución concreta o una dirección.

No todos los comentarios necesitan las tres partes, pero entre más contexto des, más útil será.

### Niveles de severidad

No todos los comentarios tienen la misma importancia. Es útil marcarlos para que el autor sepa cuáles son bloqueantes y cuáles son opcionales:

- **Bloqueante:** "Esto causa un bug" o "Esto es una vulnerabilidad de seguridad". El PR no debe aprobarse hasta que se resuelva.
- **Sugerencia:** "Podría ser más legible si..." o "Considera usar X en lugar de Y". El autor decide si lo implementa.
- **Nit (detalle menor):** "Nit: falta un punto y coma" o "Nit: este nombre de variable podría ser más descriptivo". Es opcional, no debería bloquear el PR.
- **Pregunta:** "¿Podrías explicar por qué elegiste este enfoque?" No es una crítica, es curiosidad genuina.

> **Tip:** Muchos equipos profesionales usan prefijos como `nit:`, `suggestion:`, `question:` o `blocking:` al inicio de sus comentarios para indicar la severidad. Adoptar esta práctica en tu equipo va a reducir malentendidos.

## Cómo recibir retroalimentación

Dar feedback es difícil, pero recibirlo también lo es. Aquí van algunas ideas para hacerlo bien:

### No lo tomes personal

Lo más importante: **tu código no eres tú**. Si alguien dice que tu función es confusa, no está diciendo que tú eres confuso. Está diciendo que la función podría ser más clara. Eso es información valiosa.

### Asume buena intención

Cuando leas un comentario que te incomode, antes de reaccionar, asume que la persona está tratando de ayudar. Los comentarios escritos pierden el tono de voz y las expresiones faciales. Algo que parece seco o cortante probablemente no se escribió con esa intención.

### Haz preguntas en lugar de defender

Si no estás de acuerdo con un comentario, en lugar de explicar por qué lo hiciste así, pregunta:

```
En lugar de: "Lo hice así porque..."
Intenta: "Entiendo tu punto. ¿Qué pasaría si...?"
```

Esto abre una conversación en lugar de una discusión. A veces el revisor tiene razón, a veces tú la tienes, y a veces la mejor solución es una tercera que ninguno de los dos había considerado.

### Agradece los comentarios difíciles

Los comentarios que más duelen suelen ser los más valiosos. Si alguien se tomó el tiempo de explicarte una mejor forma de hacer algo, eso es un regalo. Agradécelo, aunque en el momento no se sienta así.

## ¿Qué revisar? (Checklist)

Cuando te toque revisar un PR, este checklist te ayudará a hacer una revisión estructurada y completa:

### Funcionalidad
- [ ] ¿El código hace lo que se supone que debe hacer?
- [ ] ¿Se manejan los casos límite? (valores nulos, listas vacías, errores de red)
- [ ] ¿Qué pasa si algo falla? ¿Hay manejo de errores?

### Legibilidad
- [ ] ¿Puedo entender qué hace el código sin necesidad de que me lo expliquen?
- [ ] ¿Los nombres de variables y funciones son descriptivos?
- [ ] ¿Hay funciones demasiado largas que deberían dividirse?

### Seguridad
- [ ] ¿Se validan los datos de entrada del usuario?
- [ ] ¿No se exponen datos sensibles (contraseñas, tokens, etc.)?
- [ ] ¿Se usan consultas parametrizadas en lugar de concatenar strings para consultas a la base de datos?

### Mantenimiento
- [ ] ¿El código sigue los patrones existentes del proyecto?
- [ ] ¿Se podrá modificar este código en 6 meses sin tener que reescribirlo?
- [ ] ¿Hay código duplicado que debería extraerse a una función compartida?

### Buenas prácticas
- [ ] ¿Los commits son descriptivos y atómicos?
- [ ] ¿El PR tiene un tamaño razonable? (PRs de +500 líneas son difíciles de revisar bien)
- [ ] ¿Se incluye una descripción clara de qué hace el cambio y por qué?

> **Recuerda:** No necesitas revisar todo en cada PR. Enfócate en lo más importante según el contexto del cambio. Una corrección de un typo no necesita una revisión de seguridad.

## Anti-patrones comunes

Estas son prácticas que debes evitar tanto como revisor como autor:

### Como revisor

- **Rubber stamping:** Aprobar sin leer. "LGTM" (Looks Good To Me) sin haber revisado nada. Esto no aporta valor y da una falsa sensación de seguridad.
- **Gatekeeping:** Bloquear un PR por preferencias personales de estilo, no por problemas reales. "Yo hubiera usado un for en lugar de un forEach" no es razón para bloquear.
- **Bombardeo de nits:** Dejar 30 comentarios sobre espacios, puntos y comas y nombres de variables. Esto abruma al autor y oculta los comentarios que realmente importan. Si hay muchos problemas de estilo, sugiere configurar un linter.
- **Revisiones tardías:** Dejar pasar días sin revisar. El autor pierde contexto y el proyecto se atrasa. Intenta revisar en menos de 24 horas.

### Como autor

- **PRs gigantes:** Un PR de 2,000 líneas es casi imposible de revisar bien. Divide tu trabajo en PRs más pequeños y enfocados.
- **No dar contexto:** Un PR sin descripción obliga al revisor a adivinar qué se supone que hace. Siempre incluye: qué cambiaste, por qué, y cómo probarlo.
- **Ignorar comentarios:** Si alguien dejó un comentario y no estás de acuerdo, responde explicando tu razonamiento. No simplemente lo ignores.
- **Tomar todo personal:** Si alguien señala un problema en tu código, no es un ataque. Es una oportunidad de mejorar.

## Ejercicio práctico

Para que practiques lo que vimos, haz lo siguiente:

### Parte 1: Identifica los problemas

Lee el siguiente código de un endpoint en Express y anota los problemas que encuentres. Después escribe cómo se los comunicarías al autor de forma constructiva.

```javascript
app.post('/login', (req, res) => {
  var user = req.body.user
  var pass = req.body.pass
  
  var query = "SELECT * FROM users WHERE username='" + user + "' AND password='" + pass + "'"
  
  db.query(query, (err, results) => {
    if(results.length > 0){
      req.session.user = results[0]
      res.redirect('/dashboard')
    } else {
      res.redirect('/login')
    }
  })
})
```

Antes de ver las respuestas, tómate unos minutos para analizarlo.

**Problemas en este código:**

1. **Inyección SQL:** La query concatena directamente los valores del usuario. Un atacante podría escribir `' OR 1=1 --` como usuario y obtener acceso sin contraseña. Se deben usar consultas parametrizadas.

2. **Contraseña en texto plano:** Se compara la contraseña directamente contra la base de datos. Las contraseñas deben almacenarse hasheadas (con bcrypt, por ejemplo) y compararse usando una función de comparación segura.

3. **No hay manejo de errores:** Si `db.query` falla, `err` se ignora completamente. El servidor podría crashear o comportarse de manera inesperada.

4. **No hay validación de entrada:** No se verifica que `user` y `pass` existan o sean strings válidos antes de usarlos.

5. **Se guarda el objeto completo en la sesión:** `results[0]` probablemente incluye la contraseña hasheada. Solo se deberían guardar los campos necesarios (id, username, role).

6. **Uso de `var` en lugar de `const`/`let`:** En JavaScript moderno se prefiere `const` para valores que no cambian y `let` para los que sí.

### Parte 2: Escribe los comentarios

Ahora imagina que este código llegó como un Pull Request. Escribe al menos 3 comentarios de code review para el autor siguiendo la fórmula que vimos: **qué observas + por qué importa + qué propones**.

Ejemplo:

> **blocking:** Esta consulta es vulnerable a inyección SQL porque concatena directamente los valores del usuario en el string de la query. Un atacante podría autenticarse sin contraseña usando un payload como `' OR 1=1 --`.
>
> Propuesta: usa consultas parametrizadas. Con la librería mysql2 sería:
> ```javascript
> const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
> db.query(query, [user, pass], (err, results) => { ... });
> ```
> Aquí tienes más información: [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)

Practica escribiendo los comentarios para los otros problemas que encontraste. Verás que al principio toma tiempo pensar cómo comunicar algo de forma constructiva, pero con la práctica se vuelve natural.

## Herramientas que ayudan

A lo largo de tu carrera te encontrarás con herramientas que automatizan parte del proceso de revisión:

- **Linters** (ESLint, Prettier): Detectan problemas de estilo y errores comunes automáticamente. Si un linter puede detectarlo, no necesitas dejarlo como comentario en un PR.
- **CI/CD** (GitHub Actions, etc.): Corre los tests automáticamente en cada PR. Si los tests pasan, sabes que al menos la funcionalidad básica no se rompió.
- **Templates de PR:** GitHub permite crear templates que guían al autor a incluir descripción, screenshots, y checklist.

Estas herramientas no reemplazan el code review humano, pero eliminan el ruido para que te puedas enfocar en lo que importa: la lógica, la arquitectura y las decisiones de diseño.

## Recursos

Para profundizar en el tema, aquí tienes algunos artículos recomendados:

- [The Code Review Mindset](https://medium.engineering/the-code-review-mindset-3280a4af0a89) — La mentalidad con la que debes llegar a un code review.
- [How to Do Code Reviews Like a Human](https://mtlynch.io/human-code-reviews-1/) — Guía práctica con ejemplos concretos de cómo comunicar feedback.
- [Why I Love Code Reviews](https://medium.com/listen-to-my-story/why-i-code-reviews-a2f3df8037a3) — Perspectiva positiva sobre por qué los code reviews son valiosos.
- [How About Code Reviews?](https://slack.engineering/how-about-code-reviews-2695fb10d034) — Cómo funciona el proceso de code review en Slack Engineering.
- [Conventional Comments](https://conventionalcomments.org/) — Un estándar para escribir comentarios de code review con prefijos de severidad.
