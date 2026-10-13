-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 24, 2026 at 08:56 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ojt_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `logs`
--

CREATE TABLE `logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `log_date` date DEFAULT NULL,
  `time_in` time DEFAULT NULL,
  `time_out` time DEFAULT NULL,
  `hours_rendered` decimal(5,2) DEFAULT NULL,
  `task_description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `logs`
--

INSERT INTO `logs` (`id`, `user_id`, `log_date`, `time_in`, `time_out`, `hours_rendered`, `task_description`) VALUES
(1, 1, '2026-03-16', '08:00:00', '17:00:00', 8.00, 'Created a databased system'),
(2, 1, '2026-02-26', '08:00:00', '17:00:00', 8.00, 'Image Enhancement'),
(3, 1, '2026-02-27', '08:00:00', '17:00:00', 8.00, 'Image Enhancement'),
(4, 1, '2026-03-02', '08:00:00', '17:00:00', 8.00, 'Id Layout'),
(5, 1, '2026-03-17', '08:00:00', '17:00:00', 8.00, 'ID design'),
(6, 2, '2026-03-17', '08:00:00', '17:00:00', 8.00, 'ID editing and Picture enhancement'),
(7, 5, '2026-03-17', '07:00:00', '18:00:00', 10.00, 'Frog Operation'),
(8, 3, '2026-03-17', '07:55:00', '17:03:00', 8.13, 'bday tarp creator'),
(9, 1, '2026-03-03', '08:00:00', '17:00:00', 8.00, 'Image and ID enhancement and layout'),
(10, 1, '2026-03-04', '08:00:00', '17:00:00', 8.00, 'Database System Visitor Logs Development using Xampp, Html, CSS. and JS'),
(11, 1, '2026-03-05', '08:00:00', '17:00:00', 8.00, 'Database continuation\r\n'),
(12, 1, '2026-03-06', '08:00:00', '17:00:00', 8.00, 'Continuation'),
(13, 1, '2026-03-09', '08:00:00', '17:00:00', 8.00, 'Improving the animation and design of the Database System'),
(14, 1, '2026-03-10', '08:00:00', '17:00:00', 8.00, 'Database optimization'),
(15, 1, '2026-03-11', '08:00:00', '17:00:00', 8.00, 'Id Layout for employees '),
(16, 1, '2026-03-12', '08:00:00', '17:00:00', 8.00, 'ID optimization of designs and recommendation'),
(17, 1, '2026-03-13', '08:00:00', '17:00:00', 8.00, 'Web Portfolio using html css and js'),
(18, 8, '2026-03-18', '08:00:00', '17:00:00', 8.00, 'nag-gupit'),
(19, 1, '2026-03-18', '08:00:00', '17:00:00', 8.00, 'Big ID design and Improvement of the OJT Tracker System'),
(20, 1, '2026-03-19', '08:00:00', '17:00:00', 8.00, 'ID for big version and design and improving the Database structure of the OJT Tracker'),
(21, 3, '2026-03-18', '07:58:00', '17:04:00', 8.10, 'nothing'),
(22, 3, '2026-03-02', '07:56:00', '17:01:00', 8.08, ''),
(23, 1, '2026-03-23', '08:00:00', '17:00:00', 8.00, 'Ojt Tracker Improvement'),
(24, 1, '2026-03-24', '08:00:00', '17:00:00', 8.00, 'I improved the 2nd database that we are developing'),
(25, 14, '2026-03-24', '08:00:00', '17:00:00', 8.00, 'nothing');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `school` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `total_required` int(11) DEFAULT 600,
  `security_question` varchar(255) DEFAULT NULL,
  `security_answer` varchar(255) DEFAULT NULL,
  `role` enum('user','admin') DEFAULT 'user'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `full_name`, `school`, `password`, `total_required`, `security_question`, `security_answer`, `role`) VALUES
(1, 'Christian12', 'Christian Bondoc', 'La Consolacion University', '$2y$10$fzC6QXWw2grMdaZLRUkUuu8uXjk9ACItXdvLou6345xsA/f63EbMS', 250, 'What was your childhood nickname?', 'ponpon', 'user'),
(2, 'camilo12', 'Camilo Miguel Perez', 'La Consolacion University', '$2y$10$R6hf79DyC97QVs78ujHy9.ZsOq6c6UDCmhXRV.v96B18Yf2uTL.4a', 250, NULL, NULL, 'user'),
(3, 'khenpogata69', 'Khen Pogata', 'La Consolacion University', '$2y$10$QtVH2pjU9CuSEVYnH4O/Y.tCW.YnIEnr8p7FiV3X.5COMajGoFC2y', 250, NULL, NULL, 'user'),
(4, 'renier12', 'renier12', 'Bulacan State University', '$2y$10$RyiYoPEwXpizK2RdXJBSmOhiXG9zfOwcEB53CWbgRMzJgw/Pc0XRK', 300, NULL, NULL, 'user'),
(5, 'faith12', 'faith12', 'Centro Escolar University', '$2y$10$.25zOsHl/TqZoiTVa0cc/uc3e7fkq7ou2yrIpFVCbj5UppY1EUgTe', 500, NULL, NULL, 'user'),
(6, 'Jefferson69', 'Jefferson Cajolo', 'La Consolacion University', '$2y$10$nShxvyJSgOoFe/hMk5fIW.y8xUgebswJfvoaXQryrTSbqEz.JWda6', 1000, NULL, NULL, 'user'),
(7, 'Kenneth6969', 'Kenneth Verdadero', 'La Consolacion University', '$2y$10$lOHuJW/3sg8.8xGer4ac3usi7U/bLcj0cBPB5MyhQt63nsU5a4/CG', 500, NULL, NULL, 'user'),
(8, 'Kurt12', 'Kurt Jumaquio', 'La Consolacion University', '$2y$10$GPWCG0SEUMo/32RQzjDdPuATvLK4v6avDdixUb3JHhTvFs5Pnwegu', 600, NULL, NULL, 'user'),
(9, 'karl12', 'Karl Cyril Jopio', 'La Consolacion University', '$2y$10$3jL1f2E4YowIA.XWAmAxgezLW5IBua/pIh7t2E5rPMWqeF3VTrWEa', 250, NULL, NULL, 'user'),
(11, 'Ian25', 'Ian Bondoc', '', '$2y$10$nmwR9S97hgXDATwYJH4t1OwoEiMyyfwlRB4CNYqH5uJ4pGVJ3A4wa', 0, 'What was your childhood nickname?', 'ponpon', 'admin'),
(12, 'j.delacruz', 'Juan Dela Cruz', 'Administrator', '$2y$10$zPD/9ZHfy101wj1vGB/uyu.4CjKQTq9YDzXZiYPyiRMoz19fwgef.', 0, NULL, NULL, 'admin'),
(13, 'j.cruz', 'Juana Cruz', 'Administrator', '$2y$10$t8HKgL9nawJIwJGW16sBseL1V4e6kpwvcZr40ZB7a8eN1aFPK9ZHS', 0, NULL, NULL, 'admin'),
(14, 'joseph.c', 'Joseph Cruz', 'Baliuag University', '$2y$10$L0lJ.ILfVMzaaO2Z2RbzDOfHTTwR0kIaR8LbJKQLHCCKgDdr2Mblq', 8, NULL, NULL, 'user');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `logs`
--
ALTER TABLE `logs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_date` (`user_id`,`log_date`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `logs`
--
ALTER TABLE `logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `logs`
--
ALTER TABLE `logs`
  ADD CONSTRAINT `logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
