
CREATE TABLE appointments (
  id int(11) NOT NULL AUTO_INCREMENT,
  patient_id int(11),
  name varchar(255) NOT NULL,
  email varchar(255) NOT NULL,
  age int(11),
  day date,
  time time,
  doctor_name varchar(255),
  doctor_id int(11),
  PRIMARY KEY (id),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);
CREATE TABLE doctor  (
  id int(11) NOT NULL AUTO_INCREMENT,
  doctor_code int(10),
  specialization varchar(255)
  name varchar(255) NOT NULL,
  email varchar(255) NOT NULL unique ,
  phone int(12),
  join_time time,
  logout_timetime,
  days varchar(255),
  password varchar(255),
  PRIMARY KEY (id)


);
CREATE TABLE patient  (

  name varchar(255) NOT NULL,
  email varchar(255) NOT NULL unique ,
  password varchar(255),
  gender enum('male','female'),
  user_id int(11) NOT NULL AUTO_INCREMENT,
  token varchar(255),
  image varchar(255),
  confirmed tinyint(1),
  tokenexpires datetime,
  PRIMARY KEY (user_id)

);
