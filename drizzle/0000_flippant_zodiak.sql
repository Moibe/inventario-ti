CREATE TABLE `colaboradores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`area` text DEFAULT '' NOT NULL,
	`departamento` text DEFAULT '' NOT NULL,
	`puesto` text DEFAULT '' NOT NULL,
	`foto` text,
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `equipos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`colaborador_id` integer NOT NULL,
	`principal` integer DEFAULT false NOT NULL,
	`tipo` text DEFAULT '' NOT NULL,
	`marca` text DEFAULT '' NOT NULL,
	`modelo` text DEFAULT '' NOT NULL,
	`serie` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`colaborador_id`) REFERENCES `colaboradores`(`id`) ON UPDATE no action ON DELETE cascade
);
