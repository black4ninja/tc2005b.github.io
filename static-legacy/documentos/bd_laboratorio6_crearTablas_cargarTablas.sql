-- phpMyAdmin SQL Dump
-- version 5.1.0
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 08-04-2021 a las 18:23:08
-- Versión del servidor: 10.4.18-MariaDB
-- Versión de PHP: 8.0.3

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `rcortese`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `entregan`
--

CREATE TABLE `entregan` (
  `clave` int(11) NOT NULL,
  `rfc` varchar(15) COLLATE utf8_spanish2_ci NOT NULL,
  `numero` int(11) NOT NULL,
  `fecha` date NOT NULL,
  `cantidad` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish2_ci;

--
-- Volcado de datos para la tabla `entregan`
--

INSERT INTO `entregan` (`clave`, `rfc`, `numero`, `fecha`, `cantidad`) VALUES
(1000, 'AAAA800101', 5000, '2001-12-13', 165),
(1000, 'AAAA800101', 5019, '1999-07-13', 254),
(1010, 'BBBB800101', 5001, '1998-07-28', 528),
(1010, 'BBBB800101', 5018, '1997-02-09', 523),
(1020, 'CCCC800101', 5002, '2003-12-16', 582),
(1020, 'CCCC800101', 5017, '2000-03-29', 8),
(1030, 'DDDD800101', 5003, '1998-01-12', 202),
(1030, 'DDDD800101', 5016, '2005-06-07', 295),
(1040, 'EEEE800101', 5004, '1999-12-18', 263),
(1040, 'EEEE800101', 5015, '1999-05-29', 540),
(1050, 'FFFF800101', 5005, '2004-02-07', 503),
(1050, 'FFFF800101', 5014, '2000-04-18', 623),
(1060, 'GGGG800101', 5006, '2004-09-29', 324),
(1060, 'GGGG800101', 5013, '2002-07-23', 692),
(1070, 'HHHH800101', 5007, '2006-11-21', 2),
(1070, 'HHHH800101', 5012, '2004-11-27', 503),
(1080, 'AAAA800101', 5008, '2005-04-03', 86),
(1080, 'AAAA800101', 5011, '2003-08-28', 699),
(1090, 'BBBB800101', 5009, '1997-03-13', 73),
(1090, 'BBBB800101', 5010, '1998-11-17', 421),
(1100, 'CCCC800101', 5009, '2000-12-07', 466),
(1100, 'CCCC800101', 5010, '2001-11-19', 699),
(1110, 'DDDD800101', 5008, '2005-06-03', 337),
(1110, 'DDDD800101', 5011, '2002-01-13', 368),
(1120, 'EEEE800101', 5007, '2003-11-21', 692),
(1120, 'EEEE800101', 5012, '1997-08-05', 215),
(1130, 'FFFF800101', 5006, '2000-04-13', 562),
(1130, 'FFFF800101', 5013, '2000-02-09', 63),
(1140, 'GGGG800101', 5005, '2000-06-30', 583),
(1140, 'GGGG800101', 5014, '1999-06-28', 219),
(1150, 'HHHH800101', 5004, '2002-11-14', 453),
(1150, 'HHHH800101', 5015, '2006-02-16', 458),
(1160, 'AAAA800101', 5016, '1997-08-09', 162),
(1160, 'AAAA800101', 5019, '2003-05-05', 244),
(1170, 'BBBB800101', 5017, '2002-01-31', 180),
(1170, 'BBBB800101', 5018, '2006-07-12', 53),
(1180, 'CCCC800101', 5017, '2002-04-17', 334),
(1180, 'CCCC800101', 5018, '2001-10-24', 407),
(1190, 'DDDD800101', 5016, '2005-11-07', 356),
(1190, 'DDDD800101', 5019, '2004-11-19', 94),
(1200, 'EEEE800101', 5000, '2003-03-15', 177),
(1200, 'EEEE800101', 5015, '1998-11-07', 585),
(1210, 'FFFF800101', 5001, '2000-05-21', 43),
(1210, 'FFFF800101', 5014, '2002-09-26', 70),
(1220, 'GGGG800101', 5002, '2005-07-03', 24),
(1220, 'GGGG800101', 5013, '1998-12-16', 658),
(1230, 'HHHH800101', 5003, '1998-09-12', 530),
(1230, 'HHHH800101', 5012, '2004-08-23', 312),
(1240, 'AAAA800101', 5004, '0000-00-00', 152),
(1240, 'AAAA800101', 5011, '1997-03-13', 366),
(1250, 'BBBB800101', 5005, '2003-10-12', 71),
(1250, 'BBBB800101', 5010, '1999-01-25', 691),
(1260, 'CCCC800101', 5006, '2001-04-09', 460),
(1260, 'CCCC800101', 5009, '2001-07-28', 631),
(1270, 'DDDD800101', 5007, '2005-06-06', 506),
(1270, 'DDDD800101', 5008, '2003-01-21', 546),
(1280, 'EEEE800101', 5007, '1998-04-01', 331),
(1280, 'EEEE800101', 5008, '2002-03-23', 107),
(1290, 'FFFF800101', 5006, '2002-01-09', 279),
(1290, 'FFFF800101', 5009, '2003-06-10', 132),
(1300, 'GGGG800101', 5005, '2004-02-28', 521),
(1300, 'GGGG800101', 5010, '2001-02-10', 119),
(1310, 'HHHH800101', 5011, '2000-09-14', 72),
(1310, 'HHHH800101', 5019, '1998-05-27', 199),
(1320, 'AAAA800101', 5012, '1999-04-27', 698),
(1320, 'AAAA800101', 5018, '2002-06-23', 413),
(1330, 'BBBB800101', 5013, '2001-03-13', 554),
(1330, 'BBBB800101', 5017, '2006-06-10', 93),
(1340, 'CCCC800101', 5014, '1999-08-25', 324),
(1340, 'CCCC800101', 5016, '1997-05-11', 674),
(1350, 'DDDD800101', 5015, '1997-01-06', 272),
(1360, 'EEEE800101', 5014, '2000-02-04', 265),
(1360, 'EEEE800101', 5016, '1998-09-02', 364),
(1370, 'FFFF800101', 5013, '1997-12-03', 575),
(1370, 'FFFF800101', 5017, '1999-06-26', 44),
(1380, 'GGGG800101', 5012, '2005-12-05', 645),
(1380, 'GGGG800101', 5018, '2006-04-15', 302),
(1390, 'HHHH800101', 5011, '2003-02-16', 697),
(1390, 'HHHH800101', 5019, '2000-11-10', 107),
(1400, 'AAAA800101', 5000, '1999-04-07', 382),
(1400, 'AAAA800101', 5010, '2005-04-21', 116),
(1410, 'BBBB800101', 5001, '2000-05-18', 601),
(1410, 'BBBB800101', 5009, '2003-07-13', 467),
(1420, 'CCCC800101', 5002, '2001-09-09', 603),
(1420, 'CCCC800101', 5008, '1999-05-05', 278),
(1430, 'DDDD800101', 5003, '2005-04-30', 576),
(1430, 'DDDD800101', 5007, '2000-03-02', 13);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `materiales`
--

CREATE TABLE `materiales` (
  `clave` int(11) NOT NULL,
  `descripcion` varchar(40) COLLATE utf8_spanish2_ci NOT NULL,
  `precio` float NOT NULL,
  `impuesto` float NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish2_ci;

--
-- Volcado de datos para la tabla `materiales`
--

INSERT INTO `materiales` (`clave`, `descripcion`, `precio`, `impuesto`) VALUES
(1000, 'Varilla 3/16', 100, 10),
(1010, 'Varilla 4/32', 115, 11.5),
(1020, 'Varilla 3/17', 130, 13),
(1030, 'Varilla 4/33', 145, 14.5),
(1040, 'Varilla 3/18', 160, 16),
(1050, 'Varilla 4/34', 175, 17.5),
(1060, 'Varilla 3/19', 190, 19),
(1070, 'Varilla 4/35', 205, 20.5),
(1080, 'Ladrillos rojos', 50, 5),
(1090, 'Ladrillos grises', 35, 3.5),
(1100, 'Block', 30, 3),
(1110, 'Megablock', 40, 4),
(1120, 'Sillar rosa', 100, 10),
(1130, 'Sillar gris', 110, 11),
(1140, 'Cantera blanca', 200, 20),
(1150, 'Cantera gris', 1210, 121),
(1160, 'Cantera rosa', 1420, 142),
(1170, 'Cantera amarilla', 230, 23),
(1180, 'Recubrimiento P1001', 200, 20),
(1190, 'Recubrimiento P1010', 220, 22),
(1200, 'Recubrimiento P1019', 240, 24),
(1210, 'Recubrimiento P1028', 250, 25),
(1220, 'Recubrimiento P1037', 280, 28),
(1230, 'Cemento ', 300, 30),
(1240, 'Arena', 200, 20),
(1250, 'Grava', 100, 10),
(1260, 'Gravilla', 90, 9),
(1270, 'Tezontle', 80, 8),
(1280, 'Tepetate', 34, 3.4),
(1290, 'Tubería 3.5', 200, 20),
(1300, 'Tubería 4.3', 210, 21),
(1310, 'Tubería 3.6', 220, 22),
(1320, 'Tubería 4.4', 230, 23),
(1330, 'Tubería 3.7', 240, 24),
(1340, 'Tubería 4.5', 250, 25),
(1350, 'Tubería 3.8', 260, 26),
(1360, 'Pintura C1010', 125, 12.5),
(1370, 'Pintura B1020', 125, 12.5),
(1380, 'Pintura C1011', 725, 72.5),
(1390, 'Pintura B1021', 125, 12.5),
(1400, 'Pintura C1011', 125, 12.5),
(1410, 'Pintura B1021', 125, 12.5),
(1420, 'Pintura C1012', 125, 12.5),
(1430, 'Pintura B1022', 125, 12.5),
(2000, 'Jabón', 125, 12.5);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proveedores`
--

CREATE TABLE `proveedores` (
  `rfc` varchar(15) COLLATE utf8_spanish2_ci NOT NULL,
  `razonsocial` varchar(40) COLLATE utf8_spanish2_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish2_ci;

--
-- Volcado de datos para la tabla `proveedores`
--

INSERT INTO `proveedores` (`rfc`, `razonsocial`) VALUES
('AAAA800101', 'La fragua'),
('BBBB800101', 'Oviedo'),
('CCCC800101', 'La Ferre'),
('DDDD800101', 'Cecoferre'),
('EEEE800101', 'Alvin'),
('FFFF800101', 'Comex'),
('GGGG800101', 'Tabiquera del centro'),
('HHHH800101', 'Tubasa');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proyectos`
--

CREATE TABLE `proyectos` (
  `numero` int(11) NOT NULL,
  `denominacion` varchar(40) COLLATE utf8_spanish2_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish2_ci;

--
-- Volcado de datos para la tabla `proyectos`
--

INSERT INTO `proyectos` (`numero`, `denominacion`) VALUES
(5000, 'Vamos Mexico'),
(5001, 'Aztecon'),
(5002, 'CIT Campeche'),
(5003, 'Mexico sin ti no estamos completos'),
(5004, 'Educando en Coahuila'),
(5005, 'Infonavit Durango'),
(5006, 'Reconstrucción del templo de Guadalupe'),
(5007, 'Construcción de plaza Magnolias'),
(5008, 'Televisa en acción'),
(5009, 'Disco Atlantic'),
(5010, 'Construcción de Hospital Infantil'),
(5011, 'Remodelación de aulas del IPP'),
(5012, 'Restauración de instalaciones del CEA'),
(5013, 'Reparación de la plaza Sonora'),
(5014, 'Remodelación de Soriana'),
(5015, 'CIT Yucatan'),
(5016, 'Ampliación de la carretera a la huasteca'),
(5017, 'Reparación de la carretera del sol'),
(5018, 'Tu cambio por la educación'),
(5019, 'Queretaro limpio');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `entregan`
--
ALTER TABLE `entregan`
  ADD PRIMARY KEY (`clave`,`rfc`,`numero`,`fecha`),
  ADD KEY `rfc` (`rfc`),
  ADD KEY `numero` (`numero`);

--
-- Indices de la tabla `materiales`
--
ALTER TABLE `materiales`
  ADD PRIMARY KEY (`clave`);

--
-- Indices de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  ADD PRIMARY KEY (`rfc`);

--
-- Indices de la tabla `proyectos`
--
ALTER TABLE `proyectos`
  ADD PRIMARY KEY (`numero`);

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `entregan`
--
ALTER TABLE `entregan`
  ADD CONSTRAINT `entregan_ibfk_1` FOREIGN KEY (`rfc`) REFERENCES `proveedores` (`rfc`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `entregan_ibfk_2` FOREIGN KEY (`numero`) REFERENCES `proyectos` (`numero`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `entregan_ibfk_3` FOREIGN KEY (`clave`) REFERENCES `materiales` (`clave`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
