CREATE TABLE user_information(
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  cpf CHAR(11) DEFAULT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) DEFAULT NULL,
  removed TINYINT DEFAULT 0,
  access_level CHAR(1) DEFAULT 'U',
  validated TINYINT DEFAULT 0,
  validated_email TINYINT DEFAULT 0,
  code VARCHAR(4) DEFAULT NULL
);
-- One time
CREATE TABLE more_information(
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  mothers_name VARCHAR(255) NOT NULL,
  nationality VARCHAR (50) NOT NULL,
  rg CHAR(9) NOT NULL,
  -- Can change
  cel_phone VARCHAR(11) NOT NULL,
  education_level VARCHAR(3) NOT NULL,
  marital_status CHAR(2) NOT NULL,
  FOREIGN KEY(user_id) REFERENCES user_information(id)
);

CREATE TABLE property (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  nickname VARCHAR(255) NOT NULL,
  number INT NOT NULL,
  cep CHAR(8) NOT NULL,
  address VARCHAR(255) NOT NULL,
  complement VARCHAR(255),
  room INT NOT NULL,
  restroom INT NOT NULL,
  district VARCHAR(255) NOT NULL,
  description VARCHAR(500),
  contract CHAR(1) DEFAULT 'A',
  rent_amount INT DEFAULT 0,
  property_value INT DEFAULT 0, -- (S)ALE, (R)ENT or A(LL)
  FOREIGN KEY(user_id) REFERENCES user_information(id)
);