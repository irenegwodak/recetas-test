CREATE DATABASE recetas_db;

USE recetas_db;

CREATE TABLE recetas (
id int primary key auto_increment not null,
nombre varchar(200),
ingredientes varchar(1050),
instrucciones text
);

SELECT * FROM recetas;

INSERT INTO recetas (nombre, ingredientes, instrucciones) 
VALUES ("Ensalada Caprese", "Tomates maduros, mozzarella fresca, hojas de albahaca, aceite de oliva, sal y pimienta.", "Corta los tomates y la mozzarella en rodajas. Alterna capas de tomate, mozzarella y hojas de albahaca en un plato. Rocía con aceite de oliva, sazona con sal y pimienta al gusto. ¡Sirve y disfruta!"),
	   ("Revuelto de Vegetales", "Huevos, espinacas, champiñones, cebolla, sal y pimienta.", "Saltea la cebolla en una sartén hasta que esté dorada, agrega los champiñones y las espinacas. Bate los huevos en un tazón, agrégales sal y pimienta, y viértelos sobre las verduras en la sartén. Revuelve hasta que los huevos estén cocidos. ¡Listo para servir!"), 
       ("Pasta con Pesto de Aguacate", "Pasta, aguacate maduro, albahaca fresca, ajo, piñones, queso parmesano, aceite de oliva, sal y pimienta.", "Cocina la pasta según las instrucciones del paquete. Mientras tanto, en una licuadora, mezcla aguacate, albahaca, ajo, piñones, queso parmesano, sal y pimienta. Añade aceite de oliva gradualmente hasta obtener una consistencia suave. Mezcla la salsa con la pasta cocida. ¡Sirve y disfruta de esta variante del pesto tradicional!"); 
INSERT INTO aaa (x, y, z) 
VALUES ("", "", ""), 
	   ("", "", ""), 
       ("", "", ""); 
       
UPDATE recetas SET `nombre` = 'j', `ingredientes` = 'j', `instrucciones` = 'j' WHERE (`id` = '6');     
DELETE FROM recetas WHERE (id = 1);

SHOW processlist;