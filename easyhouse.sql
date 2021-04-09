-- phpMyAdmin SQL Dump
-- version 5.1.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 09-Abr-2021 às 19:32
-- Versão do servidor: 10.4.18-MariaDB
-- versão do PHP: 8.0.3

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `bestbet`
--

-- --------------------------------------------------------

--
-- Estrutura da tabela `evaluation_information`
--

CREATE TABLE `evaluation_information` (
  `evaluation_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `evaluation` varchar(5000) NOT NULL,
  `viewed` tinyint(4) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `evaluation_information`
--

INSERT INTO `evaluation_information` (`evaluation_id`, `user_id`, `title`, `evaluation`, `viewed`, `created_at`, `updated_at`) VALUES
(3, 10, 'Adicionar outros jogos', 'Adicionar outros jogos', 0, '2020-11-09 20:23:22', '2020-11-09 20:23:22');

-- --------------------------------------------------------

--
-- Estrutura da tabela `user_information`
--

CREATE TABLE `user_information` (
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `cpf` char(11) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `removed` tinyint(1) DEFAULT 0,
  `access_level` char(1) DEFAULT 'U',
  `validated_email` tinyint(1) DEFAULT 0,
  `code` varchar(4) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `validated` tinyint(4) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `user_information`
--

INSERT INTO `user_information` (`user_id`, `name`, `cpf`, `email`, `password`, `removed`, `access_level`, `validated_email`, `code`, `created_at`, `updated_at`, `validated`) VALUES
(3, 'Jurandir', '83945548063', 'jurandir@gmail.com', '$2a$10$7xSUfZROHWUQdQB4vcdGeuD5g4/4tySEaTCK06.i67hMEIUlW6rZe', 0, 'U', 1, NULL, '2020-11-08 15:55:09', '2020-11-08 15:56:48', 0),
(4, 'lucas', '03051696021', 'lucas@gmail.com', '$2a$10$CK3eNVZVoq/PIpB7tr9yauftU5lwxgfd/WLDZQVnP6n4O.NJ4iH.m', 0, 'U', 1, NULL, '2020-11-08 15:55:36', '2020-11-08 15:56:44', 0),
(7, 'Zaqueo', '55903021026', 'zaqueo@gmail.com', '$2a$10$6UBSbH.fnUl5HbfFCmIg0O0wS8btlcXgjni24pf5QPdquItkU.Ehm', 0, 'U', 1, NULL, '2020-11-08 15:58:05', '2020-11-08 15:58:56', 0),
(8, 'kelly', '02982664232', 'kelly@gmail.com', '$2a$10$0AW/ZowwXthqVmM0yw1EE.QBKgXFIDHIDjwauWphj7QH/yuF9l6Qy', 0, 'O', 1, NULL, '2020-11-08 16:44:08', '2020-11-08 16:48:55', 1),
(9, 'Juca José', '13669722017', 'juca@gmail.com', '$2a$10$e4lufPPNWa0bVxeWnfoJG.ENC8/6MPg4zPXNuDT/XV9TqHFitYAHy', 0, 'O', 1, NULL, '2020-11-08 17:50:02', '2020-11-08 17:50:15', 0),
(10, 'Rafael Toledo', '36214648082', 'rafaeltoledo@gmail.com', '$2a$10$f44HqSBQoOa2sAY4Zs6cG.jW1/CcIb6K4vaId5caXJqUDh7Fh2GrS', 0, 'U', 1, NULL, '2020-11-09 20:19:35', '2020-11-09 20:23:36', 0),
(11, 'Mauri', '38699595093', 'mauri@gmail.com', '$2a$10$HiicuRO604PxbB.dI6fuXevL/1iKu9AIN/l2pnoGeppIujdY7kUZG', 0, 'O', 1, NULL, '2020-11-09 20:27:45', '2020-11-09 20:27:58', 1),
(12, 'Jesimiel Efraim Dias', '45829369893', 'jesimiel.dias@gmail.com', '$2a$10$lD7jFV4Z61Fnv01HVFadDO8hkl.rTOMFBZmpy60ymlX4oOLcgQ.S.', 0, 'U', 1, 'a8eb', '2021-04-06 13:36:58', '2021-04-06 13:41:20', 1);

--
-- Índices para tabelas despejadas
--

--
-- Índices para tabela `evaluation_information`
--
ALTER TABLE `evaluation_information`
  ADD PRIMARY KEY (`evaluation_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Índices para tabela `user_information`
--
ALTER TABLE `user_information`
  ADD PRIMARY KEY (`user_id`);

--
-- AUTO_INCREMENT de tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `evaluation_information`
--
ALTER TABLE `evaluation_information`
  MODIFY `evaluation_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de tabela `user_information`
--
ALTER TABLE `user_information`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- Restrições para despejos de tabelas
--

--
-- Limitadores para a tabela `evaluation_information`
--
ALTER TABLE `evaluation_information`
  ADD CONSTRAINT `evaluation_information_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user_information` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
