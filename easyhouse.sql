CREATE TABLE user_information(
  id INT AUTO_INCREMENT PRIMARY KEY,
  folder CHAR(33) DEFAULT NULL,
  name VARCHAR(255) NOT NULL,
  cpf CHAR(11) DEFAULT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) DEFAULT NULL,
  removed TINYINT DEFAULT 0,
  access_level CHAR(1) DEFAULT 'U',
  validated TINYINT DEFAULT 0,
  code VARCHAR(4) DEFAULT NULL
);

CREATE TABLE property (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  folder CHAR(33) NOT NULL,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  nickname VARCHAR(255) NOT NULL,
  number INT NOT NULL,
  cep CHAR(8) NOT NULL,
  address VARCHAR(255) NOT NULL,
  complement VARCHAR(255),
  room INT NOT NULL,
  restroom INT NOT NULL,
  district VARCHAR(255) NOT NULL,
  description VARCHAR(500),
  contract CHAR(1) DEFAULT 'A', -- (S)ALE, (R)ENT or A(LL)
  rent_amount INT DEFAULT 0,
  property_value INT DEFAULT 0,
  created_at DATE DEFAULT CURRENT_DATE NOT NULL,
  FOREIGN KEY(user_id) REFERENCES user_information(id)
);

CREATE TABLE expense (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  description VARCHAR(500) NOT NULL,
  expense_date DATE DEFAULT CURRENT_DATE NOT NULL,
  nickname VARCHAR(255) NOT NULL,
  folder CHAR(33) DEFAULT NULL,
  value INT NOT NULL,
  created_at DATE DEFAULT CURRENT_DATE NOT NULL,
  FOREIGN KEY(property_id) REFERENCES property(id)
);