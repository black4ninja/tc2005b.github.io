-- phpMyAdmin SQL Dump
-- version 4.7.4
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 05-03-2018 a las 19:49:03
-- Versión del servidor: 10.1.29-MariaDB
-- Versión de PHP: 7.2.0

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `rbac`
--
CREATE DATABASE IF NOT EXISTS `rbac` DEFAULT CHARACTER SET latin1 COLLATE latin1_swedish_ci;
USE `rbac`;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `areatrabajo`
--

CREATE TABLE `areatrabajo` (
  `Id_AreaTrabajo` varchar(30) NOT NULL,
  `Descripcion_AreaTrabajo` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- RELACIONES PARA LA TABLA `areatrabajo`:
--

--
-- Volcado de datos para la tabla `areatrabajo`
--

INSERT INTO `areatrabajo` (`Id_AreaTrabajo`, `Descripcion_AreaTrabajo`) VALUES
('Carga', 'Personal encargado de la zona de carga'),
('Casino', 'Personal encargado de los diferentes juegos del casino'),
('Cocina', 'Personal encargado de la cocina del establecimiento'),
('Fachada', 'Personal encargado de la vigilancia de la fachada del establecimiento'),
('Limpieza', 'Personal encargado de la limpieza del establecimiento'),
('Recibidor', 'Personal encargado de la recepcion de clientes');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `privilegios`
--

CREATE TABLE `privilegios` (
  `Id_Privilegio` varchar(30) NOT NULL,
  `Accion` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- RELACIONES PARA LA TABLA `privilegios`:
--

--
-- Volcado de datos para la tabla `privilegios`
--

INSERT INTO `privilegios` (`Id_Privilegio`, `Accion`) VALUES
('AgregarAreaTrabajo', 'Permite al usuario agregar areas de trabajo\r\n'),
('AgregarPrivilegios', 'Permite al usuario agregar privilegios'),
('AgregarSeccion', 'Permite al usuario agregar secciones\r\n'),
('CrearUsuario', 'Permite al usuario crear usuarios'),
('EliminarAreaTrabajo', 'Permite al usuario eliminar un area de trabajo.'),
('EliminarSeccion', 'Permite al usuario eliminar una seccion del establecimiento'),
('EliminarUsuario', 'Permite al usuario crear a otros usuarios'),
('HabilitarPersonal', 'Permite al usuario habilitar/deshabilitar personal'),
('InformacionPersonal', 'Permite al usuario acceder a su informacion personal'),
('ModificarCliente', 'Permite al usuario modificar a los clientes\r\n'),
('ModificarInformacionPersonal', 'permite al usuario modificar su información personal'),
('NuevaTransaccion', 'Permite al usuario generar transacciones nuevas'),
('RealizarSubConsultas', 'Permite al usuario realizar subconsultas'),
('TransaccionesRealizadas', 'Permite al usuario ver sus transacciones'),
('VisualizarAreaTrabajo', 'permite al usuario visualizar su área de trabajo.'),
('VisualizarCuenta', 'Permite al usuario visualizar su cuenta'),
('VisualizarPersonalHabilitado', 'Permite al usuario visualizar a los usuario habilitados.'),
('VisualizarUsuariosRegistrados', 'permite al usuario visualizar a los otros usuarios registrados.');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `Id_Rol` varchar(30) NOT NULL,
  `Descripcion_Rol` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- RELACIONES PARA LA TABLA `roles`:
--

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`Id_Rol`, `Descripcion_Rol`) VALUES
('Administrador', 'Persona capaz de dar mantenimiento y tomar decisiones del establecimiento\r\n'),
('Cliente', 'Persona capaz de participar en las diferentes secciones del establecimiento\r\n'),
('Empleado', 'Persona encargada de alguna de las areas de trabajo del establecimiento\r\n');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles_privilegios`
--

CREATE TABLE `roles_privilegios` (
  `Id_Privilegio` varchar(30) NOT NULL,
  `Id_Rol` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- RELACIONES PARA LA TABLA `roles_privilegios`:
--   `Id_Privilegio`
--       `privilegios` -> `Id_Privilegio`
--   `Id_Rol`
--       `roles` -> `Id_Rol`
--

--
-- Volcado de datos para la tabla `roles_privilegios`
--

INSERT INTO `roles_privilegios` (`Id_Privilegio`, `Id_Rol`) VALUES
('InformacionPersonal', 'Cliente'),
('ModificarInformacionPersonal', 'Cliente'),
('VisualizarCuenta', 'Cliente'),
('TransaccionesRealizadas', 'Cliente'),
('NuevaTransaccion', 'Cliente'),
('VisualizarCuenta', 'Empleado'),
('VisualizarAreaTrabajo', 'Empleado'),
('InformacionPersonal', 'Empleado'),
('TransaccionesRealizadas', 'Empleado'),
('NuevaTransaccion', 'Empleado'),
('VisualizarCuenta', 'Administrador'),
('VisualizarUsuariosRegistrados', 'Administrador'),
('VisualizarPersonalHabilitado', 'Administrador'),
('TransaccionesRealizadas', 'Administrador'),
('RealizarSubConsultas', 'Administrador'),
('AgregarAreaTrabajo', 'Administrador'),
('AgregarSeccion', 'Administrador'),
('CrearUsuario', 'Administrador'),
('EliminarUsuario', 'Administrador'),
('ModificarCliente', 'Administrador'),
('CrearUsuario', 'Empleado'),
('ModificarCliente', 'Empleado'),
('VisualizarUsuariosRegistrados', 'Empleado'),
('CrearUsuario', 'Cliente'),
('AgregarSeccion', 'Administrador'),
('AgregarPrivilegios', 'Administrador'),
('EliminarSeccion', 'Administrador'),
('EliminarAreaTrabajo', 'Administrador'),
('HabilitarPersonal', 'Administrador');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles_usuario`
--

CREATE TABLE `roles_usuario` (
  `Id_Rol` varchar(30) NOT NULL,
  `Id_Usuario` varchar(25) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- RELACIONES PARA LA TABLA `roles_usuario`:
--   `Id_Rol`
--       `roles` -> `Id_Rol`
--   `Id_Usuario`
--       `usuario` -> `Id_Usuario`
--

--
-- Volcado de datos para la tabla `roles_usuario`
--

INSERT INTO `roles_usuario` (`Id_Rol`, `Id_Usuario`) VALUES
('Empleado', 'A02585717'),
('Empleado', 'A00000001'),
('Empleado', 'A00000002'),
('Empleado', 'A00000003'),
('Empleado', 'A00000004'),
('Empleado', 'A00000005'),
('Empleado', 'A00000006'),
('Empleado', 'A00000007'),
('Empleado', 'A00000008'),
('Empleado', 'A00000009'),
('Empleado', 'A00000010'),
('Empleado', 'A00000011'),
('Empleado', 'A00000012'),
('Empleado', 'A00000013'),
('Empleado', 'A00000014'),
('Empleado', 'A00000015'),
('Empleado', 'A00000016'),
('Empleado', 'A00000017'),
('Cliente', 'A00000018'),
('Cliente', 'A00000019'),
('Cliente', 'A00000020'),
('Cliente', 'A00000021'),
('Cliente', 'A00000022'),
('Cliente', 'A00000023'),
('Cliente', 'A00000024'),
('Cliente', 'A00000025'),
('Cliente', 'A00000026'),
('Cliente', 'A00000027'),
('Cliente', 'A00000028'),
('Cliente', 'A00000029'),
('Cliente', 'A00000030'),
('Cliente', 'A00000031'),
('Cliente', 'A00000032'),
('Cliente', 'A00000033'),
('Cliente', 'A00000034'),
('Cliente', 'A00000035'),
('Cliente', 'A00000036'),
('Cliente', 'A00000037'),
('Cliente', 'A00000038'),
('Cliente', 'A00000039'),
('Cliente', 'A00000040'),
('Cliente', 'A00000041'),
('Cliente', 'A00000042'),
('Cliente', 'A00000043'),
('Cliente', 'A00000044'),
('Cliente', 'A00000045'),
('Cliente', 'A00000046'),
('Cliente', 'A00000047'),
('Administrador', 'A00000048'),
('Administrador', 'A00000049'),
('Empleado', 'A00000018'),
('Empleado', 'A00000019');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `secciones`
--

CREATE TABLE `secciones` (
  `Id_Seccion` varchar(20) NOT NULL,
  `Ubicacion` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- RELACIONES PARA LA TABLA `secciones`:
--

--
-- Volcado de datos para la tabla `secciones`
--

INSERT INTO `secciones` (`Id_Seccion`, `Ubicacion`) VALUES
('Caja 1', 'Edificio 1 sala 1'),
('Caja 2', 'Edificio 2 sala 1'),
('Caja 3', 'Edificio 2 sala 2'),
('Casino', 'Salon A'),
('Manager', 'Oficina del manager');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `trabajadores`
--

CREATE TABLE `trabajadores` (
  `Id_Usuario` varchar(25) NOT NULL,
  `Telefono` text NOT NULL,
  `Seguro` int(8) NOT NULL,
  `Sueldo` int(15) NOT NULL,
  `RFC` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- RELACIONES PARA LA TABLA `trabajadores`:
--   `Id_Usuario`
--       `usuario` -> `Id_Usuario`
--

--
-- Volcado de datos para la tabla `trabajadores`
--

INSERT INTO `trabajadores` (`Id_Usuario`, `Telefono`, `Seguro`, `Sueldo`, `RFC`) VALUES
('A02585717', '4435098748', 102, 10240, 'CUPU800825569'),
('A00000002', '4435098748', 102, 10240, 'CUPU800825570'),
('A00000003', '4435098748', 144, 14400, 'CUPU800825571'),
('A00000017', '4435098748', 102, 10240, 'CUPU800825572'),
('A00000018', '4435098748', 102, 10240, 'CUPU800825573'),
('A00000019', '4435098748', 48, 4800, 'CUPU800825574'),
('A00000020', '4435098748', 102, 10240, 'CUPU800825575'),
('A00000021', '4435098748', 134, 13440, 'CUPU800825576'),
('A00000022', '4435098748', 102, 10240, 'CUPU800825577'),
('A00000023', '4435098748', 102, 10240, 'CUPU800825578'),
('A00000024', '4435098748', 102, 10240, 'CUPU800825579'),
('A00000025', '4435098748', 48, 4800, 'CUPU800825580'),
('A00000026', '4435098748', 102, 10240, 'CUPU800825581'),
('A00000027', '4435098748', 179, 17920, 'CUPU800825582'),
('A00000028', '4435098748', 134, 13440, 'CUPU800825583'),
('A00000029', '4435098748', 179, 17920, 'CUPU800825584'),
('A00000030', '4435098748', 208, 20800, 'CUPU800825585'),
('A00000031', '4435098748', 102, 10240, 'CUPU800825586'),
('A00000032', '4435098748', 43, 4320, 'CUPU800825587'),
('A00000033', '4435098748', 38, 3840, 'CUPU800825588'),
('A00000034', '4435098748', 51, 5120, 'CUPU800825589'),
('A00000035', '4435098748', 131, 13120, 'CUPU800825590'),
('A00000036', '4435098748', 102, 10240, 'CUPU800825591'),
('A00000037', '4435098748', 102, 10240, 'CUPU800825592'),
('A00000038', '4435098748', 102, 10240, 'CUPU800825593'),
('A00000039', '4435098748', 102, 10240, 'CUPU800825594'),
('A00000040', '4435098748', 90, 8960, 'CUPU800825595'),
('A00000041', '4435098748', 82, 8192, 'CUPU800825596'),
('A00000042', '4435098748', 77, 7680, 'CUPU800825597'),
('A00000043', '4435098748', 43, 4320, 'CUPU800825598'),
('A00000044', '4435098748', 47, 4672, 'CUPU800825599'),
('A00000045', '4435098748', 43, 4320, 'CUPU800825600'),
('A00000046', '4435098748', 43, 4320, 'CUPU800825601'),
('A00000047', '4435098748', 48, 4800, 'CUPU800825602'),
('A00000048', '4435098748', 43, 4320, 'CUPU800825603'),
('A00000049', '4435098748', 43, 4320, 'CUPU800825604');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `trabajadores_areatrabajo`
--

CREATE TABLE `trabajadores_areatrabajo` (
  `Id_Usuario` varchar(25) NOT NULL,
  `Id_AreaTrabajo` varchar(30) NOT NULL,
  `Fecha` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- RELACIONES PARA LA TABLA `trabajadores_areatrabajo`:
--   `Id_AreaTrabajo`
--       `areatrabajo` -> `Id_AreaTrabajo`
--   `Id_Usuario`
--       `usuario` -> `Id_Usuario`
--

--
-- Volcado de datos para la tabla `trabajadores_areatrabajo`
--

INSERT INTO `trabajadores_areatrabajo` (`Id_Usuario`, `Id_AreaTrabajo`, `Fecha`) VALUES
('A02585717', 'Recibidor', '0004-05-12'),
('A00000002', 'Recibidor', '0003-06-05'),
('A00000003', 'Carga', '0000-00-00'),
('A00000017', 'Cocina', '0001-01-13'),
('A00000018', 'Casino', '0008-06-10'),
('A00000019', 'Limpieza', '0000-00-00'),
('A00000020', 'Fachada', '0007-08-00');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `transaccion`
--

CREATE TABLE `transaccion` (
  `Tipo` varchar(25) NOT NULL,
  `Descripcion_Trans` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- RELACIONES PARA LA TABLA `transaccion`:
--

--
-- Volcado de datos para la tabla `transaccion`
--

INSERT INTO `transaccion` (`Tipo`, `Descripcion_Trans`) VALUES
('Abono', 'Adicion monetaria al balance de cuenta'),
('Intercambio', 'Intercambio de fichas con otro jugador'),
('Retiro', 'Retiro monetario del balance de cuenta'),
('Venta', 'Venta de fichas a otro jugador');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario`
--

CREATE TABLE `usuario` (
  `Id_Usuario` varchar(25) NOT NULL,
  `Nombre` text NOT NULL,
  `Apellidos` text NOT NULL,
  `Fecha_Creacion` date NOT NULL,
  `Fecha_Nacimiento` date NOT NULL,
  `Balance` int(10) NOT NULL,
  `Contrasena` text NOT NULL,
  `Habilitado` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- RELACIONES PARA LA TABLA `usuario`:
--

--
-- Volcado de datos para la tabla `usuario`
--

INSERT INTO `usuario` (`Id_Usuario`, `Nombre`, `Apellidos`, `Fecha_Creacion`, `Fecha_Nacimiento`, `Balance`, `Contrasena`, `Habilitado`) VALUES
('A00000001', 'Estefania', 'Villegas', '0000-00-00', '0000-00-00', 300, 'hello', 0),
('A00000002', 'Guillermo', 'Fernandez', '0003-06-05', '0000-00-00', 4500, 'ranger', 0),
('A00000003', 'Eliana', 'Ramirez', '0000-00-00', '0000-00-00', 32000, 'shadow', 0),
('A00000004', 'Jose', 'Carmona', '2012-06-17', '0000-00-00', -125, 'baseball', 0),
('A00000005', 'Marcela', 'De santis', '0007-07-08', '0000-00-00', 1500, 'donald', 0),
('A00000006', 'Daniela', 'Franco', '0006-06-18', '0000-00-00', 32000, 'harley', 0),
('A00000007', 'Rafael', 'Cortes', '0004-01-16', '0000-00-00', 42000, 'hockey', 0),
('A00000008', 'Camilo', 'Berrio', '0000-00-00', '0000-00-00', -32, 'letmein', 0),
('A00000009', 'Francisco', 'Arias', '0000-00-00', '0000-00-00', 12345, 'maggie', 0),
('A00000010', 'Antonio', 'Merizalde', '0001-04-15', '0000-00-00', 3532, 'mike', 0),
('A00000011', 'Karen', 'Restrepo', '0000-00-00', '0000-00-00', 96834, 'mustang', 0),
('A00000012', 'David', 'Lemus', '0004-08-07', '0000-00-00', -564, 'snoopy', 0),
('A00000013', 'Javier', 'Santana', '0000-00-00', '0000-00-00', 9342, 'buster', 0),
('A00000014', 'Virginia', 'Saldarriaga', '0009-09-01', '0000-00-00', -900, 'dragon', 0),
('A00000015', 'Sergio', 'Posada', '0002-02-08', '0000-00-00', 0, 'jordan', 0),
('A00000016', 'Jorge', 'Zea ', '0000-00-00', '0000-00-00', 0, 'michael', 0),
('A00000017', 'Mariana', 'Diaz ', '0001-01-13', '0000-00-00', 0, 'michelle', 0),
('A00000018', 'Esteban', 'Giraldo', '0008-06-10', '0000-00-00', 0, 'mindy', 0),
('A00000019', 'Jorge', 'Idarraga', '0000-00-00', '0000-00-00', 0, 'patrick', 0),
('A00000020', 'Alejandro', 'Simanca', '0007-08-00', '0000-00-00', 124543, '123abc', 0),
('A00000021', 'Angelina', 'Pulgarin', '0007-07-17', '0000-00-00', -57876, 'andrew', 0),
('A00000022', 'Brenda', 'Aguirre', '0009-06-14', '0000-00-00', -6094, 'bear', 0),
('A00000023', 'Gloria', 'Tamayo', '2011-12-16', '0000-00-00', 9098, 'calvin', 0),
('A00000024', 'Andrea', 'Carmona ', '0003-04-18', '0000-00-00', 18760, 'changeme', 0),
('A00000025', 'Lucero', 'Diaz ', '0006-05-00', '0000-00-00', -6953, 'diamond', 0),
('A00000026', 'Angela', 'Alzate', '0005-11-12', '0000-00-00', -17940, 'fuckme', 0),
('A00000027', 'Felipe', 'Arango', '0000-00-00', '0000-00-00', -8024, 'fuckyou', 0),
('A00000028', 'Elena', 'Garces', '0006-12-09', '0000-00-00', 2014, 'matthew', 0),
('A00000029', 'Carmen', 'Uribe', '0000-00-00', '0000-00-00', 8604, 'miller', 0),
('A00000030', 'Daniel', 'Ospina', '0000-00-00', '0000-00-00', 9889, 'ou812', 0),
('A00000031', 'Alberto', 'Pel?ez', '0000-00-00', '0000-00-00', -213, 'tiger', 0),
('A00000032', 'Elena', 'Perez', '0000-00-00', '0000-00-00', -67765, 'trustno1', 0),
('A00000033', 'Sebastian', 'Carmona', '0000-00-00', '0000-00-00', -4764, '12345678', 0),
('A00000034', 'Oscar', 'Cifuentes', '0001-03-05', '0000-00-00', -80086, 'alex', 0),
('A00000035', 'Santiago', 'Jaramillo', '2011-05-06', '0000-00-00', -3562, 'apple', 0),
('A00000036', 'Luis', 'Melano', '0000-00-00', '0000-00-00', 2323, 'avalon', 0),
('A00000037', 'Tammy', 'Mendez', '0003-11-03', '0000-00-00', 6574, 'brandy', 0),
('A00000038', 'Tomas', 'Ramirez', '0000-00-00', '0000-00-00', 322, 'chelsea', 0),
('A00000039', 'Felipe', 'Girando', '0000-00-00', '0000-00-00', 1000, 'coffee', 0),
('A00000040', 'Patricia', 'Diez', '0000-00-00', '0000-00-00', 0, 'dave', 0),
('A00000041', 'Luisa', 'Sierra', '0002-03-16', '0000-00-00', 0, 'falcon', 0),
('A00000042', 'Sara', 'Vallejo', '0000-00-00', '0000-00-00', 0, 'freedom', 0),
('A00000043', 'Alexandra', 'Guerrero', '0002-10-18', '0000-00-00', 21321, 'gandalf', 0),
('A00000044', 'Lisa', 'Guerra', '0000-00-00', '0000-00-00', -12342, 'golf', 0),
('A00000045', 'Ana Maria', 'Rodr?guez ', '0000-00-00', '0000-00-00', 5477, 'green', 0),
('A00000046', 'Sofia', 'Marulanda', '0000-00-00', '0000-00-00', -789, 'helpme', 0),
('A00000047', 'Paula', 'Palacio', '2010-12-00', '0000-00-00', 3456, 'linda', 0),
('A00000048', 'Jesus', 'Bermudez', '0000-00-00', '0000-00-00', 33753, 'biteme', 0),
('A00000049', 'Roberta', 'Toledo', '0000-00-00', '0000-00-00', 365855, 'boomer', 0),
('A02585717', 'Jeronimo', 'Burgos', '0004-05-12', '0000-00-00', -3200, 'canada', 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario_transaccion`
--

CREATE TABLE `usuario_transaccion` (
  `Id_Us-Trans` int(9) NOT NULL,
  `Monto` int(15) NOT NULL,
  `Fecha` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Tipo` varchar(25) NOT NULL,
  `Id_Seccion` varchar(20) NOT NULL,
  `Id_Usuario` varchar(25) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- RELACIONES PARA LA TABLA `usuario_transaccion`:
--   `Id_Seccion`
--       `secciones` -> `Id_Seccion`
--   `Id_Usuario`
--       `usuario` -> `Id_Usuario`
--   `Tipo`
--       `transaccion` -> `Tipo`
--

--
-- Volcado de datos para la tabla `usuario_transaccion`
--

INSERT INTO `usuario_transaccion` (`Id_Us-Trans`, `Monto`, `Fecha`, `Tipo`, `Id_Seccion`, `Id_Usuario`) VALUES
(1, 14500, '2012-10-08 05:00:00', 'Abono', 'Caja 1', 'A02585717'),
(2, 2500, '0000-00-00 00:00:00', 'Retiro', 'Manager', 'A00000001'),
(3, 27200, '0000-00-00 00:00:00', 'Venta', 'Casino', 'A00000002'),
(4, 675, '2012-01-08 06:00:00', 'Abono', 'Casino', 'A00000026'),
(5, 2214, '2012-12-14 06:00:00', 'Abono', 'Casino', 'A00000015'),
(6, 1300, '0000-00-00 00:00:00', 'Retiro', 'Caja 2', 'A00000023'),
(7, 241, '0000-00-00 00:00:00', 'Abono', 'Caja 1', 'A00000026'),
(8, 54, '0000-00-00 00:00:00', 'Retiro', 'Caja 2', 'A00000015'),
(9, 75, '0000-00-00 00:00:00', 'Venta', 'Caja 3', 'A00000008'),
(10, 6, '0000-00-00 00:00:00', 'Intercambio', 'Casino', 'A00000002'),
(20, 2436, '0000-00-00 00:00:00', 'Retiro', 'Caja 1', 'A00000026'),
(21, 768654, '0000-00-00 00:00:00', 'Venta', 'Caja 2', 'A00000002'),
(22, 9764, '0000-00-00 00:00:00', 'Intercambio', 'Caja 3', 'A00000021'),
(33, 22, '0000-00-00 00:00:00', 'Venta', 'Caja 1', 'A00000036'),
(34, 45789, '0000-00-00 00:00:00', 'Intercambio', 'Caja 2', 'A00000043'),
(37, 578, '0000-00-00 00:00:00', 'Abono', 'Manager', 'A00000036'),
(46, 73, '0000-00-00 00:00:00', 'Intercambio', 'Caja 1', 'A00000045'),
(49, 757, '2011-04-02 06:00:00', 'Abono', 'Casino', 'A00000048'),
(50, 234, '0000-00-00 00:00:00', 'Retiro', 'Manager', 'A00000023');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `areatrabajo`
--
ALTER TABLE `areatrabajo`
  ADD PRIMARY KEY (`Id_AreaTrabajo`);

--
-- Indices de la tabla `privilegios`
--
ALTER TABLE `privilegios`
  ADD PRIMARY KEY (`Id_Privilegio`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`Id_Rol`);

--
-- Indices de la tabla `roles_privilegios`
--
ALTER TABLE `roles_privilegios`
  ADD KEY `Id_Privilegio` (`Id_Privilegio`),
  ADD KEY `Id_Rol` (`Id_Rol`);

--
-- Indices de la tabla `roles_usuario`
--
ALTER TABLE `roles_usuario`
  ADD KEY `Id_Rol` (`Id_Rol`),
  ADD KEY `Id_Usuario` (`Id_Usuario`);

--
-- Indices de la tabla `secciones`
--
ALTER TABLE `secciones`
  ADD PRIMARY KEY (`Id_Seccion`);

--
-- Indices de la tabla `trabajadores`
--
ALTER TABLE `trabajadores`
  ADD KEY `Id_Usuario` (`Id_Usuario`);

--
-- Indices de la tabla `trabajadores_areatrabajo`
--
ALTER TABLE `trabajadores_areatrabajo`
  ADD KEY `Id_AreaTrabajo` (`Id_AreaTrabajo`),
  ADD KEY `Id_Usuario` (`Id_Usuario`);

--
-- Indices de la tabla `transaccion`
--
ALTER TABLE `transaccion`
  ADD PRIMARY KEY (`Tipo`);

--
-- Indices de la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`Id_Usuario`);

--
-- Indices de la tabla `usuario_transaccion`
--
ALTER TABLE `usuario_transaccion`
  ADD PRIMARY KEY (`Id_Us-Trans`),
  ADD KEY `Id_Seccion` (`Id_Seccion`),
  ADD KEY `Id_Usuario` (`Id_Usuario`),
  ADD KEY `Tipo` (`Tipo`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `usuario_transaccion`
--
ALTER TABLE `usuario_transaccion`
  MODIFY `Id_Us-Trans` int(9) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `roles_privilegios`
--
ALTER TABLE `roles_privilegios`
  ADD CONSTRAINT `roles_privilegios_ibfk_1` FOREIGN KEY (`Id_Privilegio`) REFERENCES `privilegios` (`Id_Privilegio`),
  ADD CONSTRAINT `roles_privilegios_ibfk_2` FOREIGN KEY (`Id_Rol`) REFERENCES `roles` (`Id_Rol`);

--
-- Filtros para la tabla `roles_usuario`
--
ALTER TABLE `roles_usuario`
  ADD CONSTRAINT `roles_usuario_ibfk_1` FOREIGN KEY (`Id_Rol`) REFERENCES `roles` (`Id_Rol`),
  ADD CONSTRAINT `roles_usuario_ibfk_2` FOREIGN KEY (`Id_Usuario`) REFERENCES `usuario` (`Id_Usuario`);

--
-- Filtros para la tabla `trabajadores`
--
ALTER TABLE `trabajadores`
  ADD CONSTRAINT `trabajadores_ibfk_1` FOREIGN KEY (`Id_Usuario`) REFERENCES `usuario` (`Id_Usuario`);

--
-- Filtros para la tabla `trabajadores_areatrabajo`
--
ALTER TABLE `trabajadores_areatrabajo`
  ADD CONSTRAINT `trabajadores_areatrabajo_ibfk_1` FOREIGN KEY (`Id_AreaTrabajo`) REFERENCES `areatrabajo` (`Id_AreaTrabajo`),
  ADD CONSTRAINT `trabajadores_areatrabajo_ibfk_2` FOREIGN KEY (`Id_Usuario`) REFERENCES `usuario` (`Id_Usuario`);

--
-- Filtros para la tabla `usuario_transaccion`
--
ALTER TABLE `usuario_transaccion`
  ADD CONSTRAINT `usuario_transaccion_ibfk_1` FOREIGN KEY (`Id_Seccion`) REFERENCES `secciones` (`Id_Seccion`),
  ADD CONSTRAINT `usuario_transaccion_ibfk_2` FOREIGN KEY (`Id_Usuario`) REFERENCES `usuario` (`Id_Usuario`),
  ADD CONSTRAINT `usuario_transaccion_ibfk_3` FOREIGN KEY (`Tipo`) REFERENCES `transaccion` (`Tipo`);


--
-- Metadatos
--
USE `phpmyadmin`;

--
-- Metadatos para la tabla areatrabajo
--

--
-- Metadatos para la tabla privilegios
--

--
-- Metadatos para la tabla roles
--

--
-- Metadatos para la tabla roles_privilegios
--

--
-- Metadatos para la tabla roles_usuario
--

--
-- Metadatos para la tabla secciones
--

--
-- Metadatos para la tabla trabajadores
--

--
-- Metadatos para la tabla trabajadores_areatrabajo
--

--
-- Metadatos para la tabla transaccion
--

--
-- Metadatos para la tabla usuario
--

--
-- Metadatos para la tabla usuario_transaccion
--

--
-- Metadatos para la base de datos rbac
--

--
-- Volcado de datos para la tabla `pma__relation`
--

INSERT INTO `pma__relation` (`master_db`, `master_table`, `master_field`, `foreign_db`, `foreign_table`, `foreign_field`) VALUES
('rbac', 'Trabajadores_AreaTrabajo', 'Id_AreaTrabajo', 'rbac', 'areatrabajo', 'Id_AreaTrabajo'),
('rbac', 'Trabajadores_AreaTrabajo', 'Id_Usuario', 'rbac', 'usuario', 'Id_Usuario');
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
