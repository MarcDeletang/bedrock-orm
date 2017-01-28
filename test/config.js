module.exports = {
	host: '127.0.0.1',	//localhost || ip
	user: 'postgres',
	database: 'demo',
	password: 'postgrespasswordfail',
	port: 5432,
	max: 100,		//Number clients max
	idleTimeoutMillis: 500,
	setTrigger: true,
	setGlobal: false
}