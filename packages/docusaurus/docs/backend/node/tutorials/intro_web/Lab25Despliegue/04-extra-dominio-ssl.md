---
sidebar_position: 4
---

# Material complementario — Dominios y SSL

:::info Material complementario, no es parte del laboratorio
Este apartado **no se realiza en el laboratorio** porque requiere un **servidor real con IP pública** y un **dominio comprado**, cosas que no podemos simular dentro de un contenedor Docker en tu computadora.

Sin embargo, es **conocimiento esencial** para cualquier despliegue real. Léelo con calma — entender estos conceptos te dará una visión completa de cómo funciona la web profesional.
:::

---

## ¿Qué es un dominio?

Un **dominio** es el nombre legible que escribes en tu navegador, como `google.com` o `tec.mx`. Internamente, las computadoras solo se entienden con **direcciones IP** (números como `142.250.190.46`), pero nadie va a recordar eso.

El **DNS** (*Domain Name System*) es la "libreta de teléfonos" de internet: traduce `google.com` → `142.250.190.46` automáticamente.

```
   Tu navegador                                          Servidor de Google
   ┌──────────┐    1. ¿Cuál es la IP de google.com?
   │          │  ──────────────────────────────────→  ┌──────────────┐
   │  Chrome  │                                       │  Servidor DNS │
   │          │    2. Es 142.250.190.46                │              │
   │          │  ←──────────────────────────────────  └──────────────┘
   │          │
   │          │    3. Conexión a 142.250.190.46:80    ┌──────────────┐
   │          │  ────────────────────────────────────→│   Servidor    │
   │          │                                       │   de Google   │
   └──────────┘                                       └──────────────┘
```

Todo esto pasa en **milisegundos** y es invisible para el usuario.

---

## ¿Cómo se obtiene un dominio?

Los dominios **se compran** (se rentan, en realidad) a empresas llamadas **registradores**. Las más conocidas:

| Registrador | Precio aprox. (.com / año) | Notas |
|-------------|----------------------------|-------|
| [Cloudflare](https://www.cloudflare.com/products/registrar/) | ~10 USD | Recomendado: precio al costo, sin sobreprecios |
| [Namecheap](https://www.namecheap.com/) | ~10–15 USD | Interfaz amigable, buen soporte |
| [GoDaddy](https://www.godaddy.com/) | ~12–20 USD | Muy popular, a veces con ofertas el primer año |
| [Google Domains](https://domains.google/) | ~12 USD | (ahora se está migrando a Squarespace) |

Hay extensiones más baratas (`.xyz`, `.dev`, `.online`) y otras más caras (`.io` ~40 USD/año).

:::info Dominios gratis para estudiantes
[GitHub Education](https://education.github.com/pack) ofrece dominios `.me` gratuitos por un año, además de muchos otros recursos. Si tienes correo `@tec.mx`, califícate al **Student Pack** y aprovéchalo.
:::

---

## ¿Cómo conectas tu dominio con tu servidor?

Una vez que compras `tusitio.com`, tienes que decirle al DNS **a qué servidor apunta**. Esto se hace creando un **registro A** (de "Address") en el panel del registrador:

```
Tipo:   A
Nombre: @            (esto representa tusitio.com sin subdominio)
Valor:  203.0.113.42 (la IP pública de tu servidor)
TTL:    Auto         (tiempo que dura el cache del DNS)
```

Y para que `www.tusitio.com` también funcione, agregas otro registro:

```
Tipo:   A
Nombre: www
Valor:  203.0.113.42
```

Después de guardar, los cambios pueden tardar **de minutos a varias horas** en propagarse por todos los servidores DNS del mundo. Puedes verificar con `nslookup tusitio.com` desde la terminal.

---

## Configurar Nginx para tu dominio

Recuerda la configuración que hicimos en la Parte 3:

```nginx
server {
    listen 80;
    server_name localhost;
    ...
}
```

En un servidor real, cambias `localhost` por tu dominio:

```nginx
server {
    listen 80;
    server_name tusitio.com www.tusitio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Y recargas Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

A partir de aquí, cuando alguien escribe `tusitio.com` en su navegador, el DNS lo manda a tu servidor, Nginx ve el `Host: tusitio.com` en la petición y la dirige al backend Express. ✨

---

## ¿Qué es HTTPS y por qué importa?

Probablemente notaste que cuando entras a un banco o a Gmail, la URL empieza con **`https://`** y aparece un **candado** al lado:

```
🔒 https://www.bbva.mx
```

**HTTPS** (HTTP **S**ecure) significa que la conexión está **cifrada**: nadie en el camino (tu cafetería, tu ISP, tu gobierno) puede leer lo que se envía o recibe entre tu navegador y el servidor.

### ¿Por qué siempre HTTPS?

1. **Privacidad**: contraseñas, mensajes, tarjetas de crédito viajan ilegibles.
2. **Integridad**: nadie puede modificar la respuesta del servidor en el camino (inyectar publicidad, malware, etc.).
3. **Identidad**: el certificado prueba que `bbva.mx` es realmente BBVA y no un sitio falso.
4. **Requerido por navegadores modernos**: muchas APIs (cámara, micrófono, geolocalización, *service workers*) **no funcionan sin HTTPS**.
5. **SEO**: Google penaliza sitios sin HTTPS en los resultados de búsqueda.

### ¿Cómo funciona técnicamente?

HTTPS usa **certificados SSL/TLS** emitidos por **autoridades certificadoras** (CAs) confiables. El navegador valida el certificado antes de iniciar la comunicación cifrada. Antes los certificados eran **caros** (cientos de dólares al año), pero hoy hay una opción **gratuita** y automatizada: **Let's Encrypt**.

---

## Let's Encrypt y Certbot

**[Let's Encrypt](https://letsencrypt.org/)** es una autoridad certificadora gratuita y sin fines de lucro fundada en 2015. Hoy emite la mayoría de los certificados SSL de internet.

**[Certbot](https://certbot.eff.org/)** es la herramienta oficial para pedir y renovar certificados de Let's Encrypt **automáticamente**. Es como tener un asistente que se encarga de todo el papeleo SSL.

### Instalar Certbot

En un servidor Ubuntu real:

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

`python3-certbot-nginx` es un plugin que **detecta automáticamente** tu configuración de Nginx y la modifica para usar HTTPS.

### Obtener el certificado

Con un solo comando:

```bash
sudo certbot --nginx -d tusitio.com -d www.tusitio.com
```

Certbot va a:

1. **Verificar** que el dominio realmente apunta a tu servidor (con un desafío automático).
2. **Solicitar** un certificado a Let's Encrypt.
3. **Modificar** tu archivo de Nginx para escuchar también en el puerto 443 (HTTPS).
4. **Configurar** la redirección automática de HTTP → HTTPS.

Te va a hacer algunas preguntas:

- **Email** (para avisarte cuando el certificado vaya a expirar): tu email.
- **Aceptar términos**: A.
- **Compartir email con EFF**: opcional, N o Y.
- **¿Redirigir HTTP a HTTPS?**: **2** (Redirect, recomendado).

Al terminar, tu archivo Nginx queda así (sin que tú lo edites a mano):

```nginx
server {
    listen 443 ssl;
    server_name tusitio.com www.tusitio.com;

    ssl_certificate /etc/letsencrypt/live/tusitio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tusitio.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name tusitio.com www.tusitio.com;
    return 301 https://$host$request_uri;
}
```

El primer bloque atiende HTTPS. El segundo redirige todo HTTP al HTTPS automáticamente.

### Renovación automática

Los certificados de Let's Encrypt **duran 90 días**. Certbot configura una **tarea automática** (cron job) que los renueva antes de que expiren. Puedes verificar que la renovación funciona con:

```bash
sudo certbot renew --dry-run
```

(El `--dry-run` simula la renovación sin hacerla de verdad).

Si alguna vez ves un error, la renovación queda pausada hasta que lo arregles. Por eso es importante revisar el correo que registraste — Let's Encrypt te avisa con varios días de anticipación.

---

## Resultado final

Después de todo esto, tu app está accesible para todo el mundo en:

```
https://tusitio.com
```

Con candado verde, tráfico cifrado y todas las APIs modernas habilitadas.

```
   Cualquier usuario                                    Tu servidor real
   en el mundo                                          (DigitalOcean, AWS, etc.)
   ┌──────────┐                                         ┌────────────────────────────┐
   │          │  1. ¿IP de tusitio.com?                 │  Linux Ubuntu              │
   │          │  ←──── DNS responde 203.0.113.42        │                            │
   │  Chrome  │                                         │  Nginx (puertos 80, 443)   │
   │          │                                         │       │                    │
   │          │  2. https://tusitio.com (puerto 443)    │       │ proxy_pass         │
   │          │  ────────────────────────────────────→  │       ▼                    │
   │          │                                         │  Express (puerto 3000)     │
   │          │  3. Respuesta cifrada                   │       └─ PM2               │
   │          │  ←────────────────────────────────────  │                            │
   └──────────┘                                         └────────────────────────────┘
```

---

## Resumen

| Elemento | ¿Para qué sirve? | ¿Cuesta? |
|----------|------------------|----------|
| **Dominio** | Tener una URL legible (`tusitio.com`) | ~10 USD/año |
| **Servidor** | Tener una computadora encendida 24/7 con IP pública | desde 4 USD/mes (DigitalOcean droplet) |
| **DNS (registro A)** | Conectar dominio con IP del servidor | Gratis (incluido con el dominio) |
| **Nginx** | Servir el sitio y manejar HTTPS | Gratis (open source) |
| **Certbot + Let's Encrypt** | Certificado SSL gratuito y automático | Gratis |

:::tip Lo que aprendiste con esta práctica
Aunque la práctica usó Docker como simulador, **todos los pasos que hiciste son los mismos** que en un servidor real. La única diferencia es:

- En lugar de `docker exec -it mi-servidor bash` usarías `ssh estudiante@tu-servidor.com` para conectarte.
- En lugar de `localhost` configurarías tu dominio real.
- Agregarías HTTPS con Certbot.

¡Ya tienes la base para desplegar cualquier app Node.js en producción!
:::

---

## Recursos para profundizar

- [Documentación oficial de Nginx](https://nginx.org/en/docs/) — referencia completa de directivas
- [Documentación de Certbot](https://certbot.eff.org/instructions) — guías por sistema operativo
- [DigitalOcean Tutorials](https://www.digitalocean.com/community/tutorials) — guías paso a paso de despliegues reales en Linux
- [PM2 Docs](https://pm2.keymetrics.io/docs/usage/quick-start/) — referencia avanzada de PM2
- [Cloudflare DNS](https://developers.cloudflare.com/dns/) — guía de configuración DNS
