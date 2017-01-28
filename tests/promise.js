


function query(string){
    return new Promise((resolve, reject)=>{
        setTimeout(() =>{
            resolve('Queried ' + string)
        }, 1000)
    })
}

function test(){
    throw 'lol'
}


function call(){
    return query('call').then(result =>{
        console.log('RESULT', result)
        test()
    })
}

call().then(response => {
    console.log('response', response)
},
error =>{
    console.log('error', error)
})