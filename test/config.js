module.exports = {
	host: '127.0.0.1',	//localhost || ip
	user: 'postgres',
	database: 'demo',
	password: 'postgrespassword',
	port: 5432,
	max: 100,		//Number clients max
	idleTimeoutMillis: 500,
	setTrigger: true
}