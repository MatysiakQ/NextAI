-- phpMyAdmin SQL Dump
-- version 4.9.11
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Czas generowania: 09 Cze 2025, 23:36
-- Wersja serwera: 10.5.29-MariaDB-0+deb11u1
-- Wersja PHP: 7.4.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Baza danych: `nextai`
--

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `checkout_sessions`
--

CREATE TABLE `checkout_sessions` (
  `id` int(11) NOT NULL,
  `stripe_session_id` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `plan` varchar(50) DEFAULT NULL,
  `amount` int(11) DEFAULT NULL,
  `currency` varchar(3) DEFAULT 'usd',
  `status` enum('open','complete','expired') NOT NULL DEFAULT 'open',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `completed_at` datetime DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Zrzut danych tabeli `checkout_sessions`
--

INSERT INTO `checkout_sessions` (`id`, `stripe_session_id`, `email`, `user_id`, `plan`, `amount`, `currency`, `status`, `created_at`, `completed_at`) VALUES
(0, 'cs_test_a1jJbOPTHXbMhEDLlZo55lTsvsoF2DaoyEo6tEpJ0HTZsuPFp9U7uENmXW', 'koszolkolukasz@gmail.com', 0, 'unknown', NULL, 'usd', 'complete', '2025-06-03 23:30:36', '2025-06-04 01:30:36');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `invoices`
--

CREATE TABLE `invoices` (
  `id` int(11) NOT NULL,
  `stripe_customer_id` varchar(255) NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `company_nip` varchar(20) DEFAULT NULL,
  `company_address` varchar(255) DEFAULT NULL,
  `company_zip` varchar(20) DEFAULT NULL,
  `company_city` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `message` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `stripe_events`
--

CREATE TABLE `stripe_events` (
  `id` int(11) NOT NULL,
  `stripe_event_id` varchar(100) NOT NULL,
  `event_type` varchar(50) NOT NULL,
  `processed` tinyint(1) NOT NULL DEFAULT 0,
  `data` longtext DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `subscriptions`
--

CREATE TABLE `subscriptions` (
  `id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `stripe_customer_id` varchar(100) DEFAULT NULL,
  `stripe_subscription_id` varchar(100) DEFAULT NULL,
  `plan` varchar(50) NOT NULL DEFAULT 'unknown',
  `status` enum('active','trialing','pending_cancellation','canceled','incomplete','incomplete_expired','past_due','unpaid') NOT NULL DEFAULT 'active',
  `cancel_at_period_end` tinyint(1) DEFAULT 0,
  `current_period_start` datetime DEFAULT NULL,
  `current_period_end` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Zrzut danych tabeli `subscriptions`
--

INSERT INTO `subscriptions` (`id`, `email`, `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `plan`, `status`, `cancel_at_period_end`, `current_period_start`, `current_period_end`, `created_at`, `updated_at`) VALUES
(0, 'koszolkolukasz@gmail.com', 0, 'cus_SQwAVKL8ifl6FB', 'sub_1RW4HvFQBh6Vdz2ppQaQQLiO', 'unknown', 'canceled', 0, NULL, NULL, '2025-06-03 23:30:36', '2025-06-03 23:47:47');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `username` varchar(50) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `reset_code_expires` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Zrzut danych tabeli `users`
--

INSERT INTO `users` (`id`, `email`, `username`, `password`, `reset_code_expires`, `created_at`, `updated_at`) VALUES
(1, 'ajastrzebski2104@gmail.com', 'matysiakq', '$2y$10$KL5KGf/rodJzqaZGq3XH2e40o72bAlMF6N8DA5GzU1i7BcG2IrZoG', NULL, '2025-06-03 18:06:12', '2025-06-03 18:06:12'),
(2, 'koszolkolukasz@gmail.com', 'HoldMyPiwko', '$2y$10$.r7D3Vd5Lyj8fxofzysaJeNQxS54hZX.YAZ/HXc4qylbFldCOWPte', NULL, '2025-06-03 23:46:42', '2025-06-03 23:46:42'),
(3, '123@gmail.com', '324205', '$2y$10$Kmgz.Oi.t/tLbFOoBeGKU.6x3bcT5hPXayx15RXAgxRME9EwRoQv2', NULL, '2025-06-09 15:31:40', '2025-06-09 15:31:40'),
(4, 'srakadupa@gmail.com', '324205', '$2y$10$bKCJUuvmijZPvYL8J1Wm4.sLPung4rkVucy7diTgxAmhSdOVZETES', NULL, '2025-06-09 17:50:35', '2025-06-09 17:50:35');

--
-- Indeksy dla zrzutów tabel
--

--
-- Indeksy dla tabeli `subscriptions`
--
ALTER TABLE `subscriptions`
  ADD KEY `idx_subscriptions_active_status` (`email`,`status`,`current_period_end`);

--
-- Indeksy dla tabeli `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT dla zrzuconych tabel
--

--
-- AUTO_INCREMENT dla tabeli `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
