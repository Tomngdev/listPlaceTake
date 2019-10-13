const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const mysqlConnectionPool = mysql.createPool({
  host: 'us-cdbr-iron-east-05.cleardb.net',
  user: 'b92a6b073d3b29',
  password: 'b91cc937',
  database : 'heroku_3f57e6b34e159e8'
});
const googleMapsClient = require('@google/maps').createClient({
  key: 'AIzaSyA8Nonzt-Te1SCgVOzZ50EfJlKMJS6wiO8',
  Promise: Promise
});
const errorMsg = { "error" : "ERROR_DESCRIPTION" };

/* GET home page. */
router.get('/', function(req, res, next) {
  mysqlConnectionPool.getConnection(function(err, connection) {
    if(err) { 
      console.log(err); 
      return; 
    } else {
      console.log("DB Connection successful");
    }
    var sql = "SELECT id, distance, status FROM lalalistplacetake";
    connection.query(sql, [], function(err, results ) {
      connection.release(); 
      if(err) { 
        console.log(err); 
        return; 
      }
      console.log( results);
    });
  });

  res.render('index', { title: 'Express' });
});

router.get('/orders', function(req, res, next) {
  // /orders?page=:page&limit=:limit
  res.set('Content-Type', 'application/json');
  let page = 0;
  let limit = 0;
  let result = "";
  if( !Number.isInteger(Number(req.query.page)) || !Number.isInteger(Number(req.query.limit))
    || Number(req.query.page) < 1 || Number(req.query.limit < 1 ) 
  ){ 
    res.status(400).json({ "error": "ERROR_DESCRIPTION"});
  } else {
    page = Number(req.query.page);
    limit = Number(req.query.limit);
  
    mysqlConnectionPool.getConnection(function(err, connection) {
      if (err) { 
        console.log(err); 
        return; 
      } else {
        console.log("DB Connection successful");
      }
      let sql = "SELECT id, distance, status FROM lalalistplacetake limit ?";
      connection.query(sql, [limit], function(err, results ) {
        connection.release(); 
        if(err) { 
          console.log(err); 
          return; 
        } else {        
          res.status(200).json(JSON.parse(JSON.stringify(results)));
        }      
      });
    });
  }
});

router.post('/orders',function(req,res, next) {
  // create orders
  // console.log("req body ->", req.body.origin[0]);
  
  res.set('Content-Type', 'application/json');

  let distance = "default";
  let initialStatus = "UNASSIGNED"

  setTimeout(() => {
    googleMapsClient.distanceMatrix({
      // origins:'22.319371, 114.169359',
      // destinations:'22.280600, 114.185057',
      origins: req.body.origin[0]+ ',' + req.body.origin[1],
      destinations: req.body.destination[0]+ ',' + req.body.destination[1],
      mode: "driving"
    })
    .asPromise()
    .then((response) => {
      if (response.json.rows[0].elements[0].distance != undefined) {
        distance = response.json.rows[0].elements[0].distance.text;
        console.log("distance ->", distance);
        mysqlConnectionPool.getConnection(function(err, connection) {
          if (err) { 
            console.log(err); 
            res.json(errorMsg);
            return; 
          } else {
            console.log("DB Connection successful");
            let insertSql = "INSERT INTO lalaListPlaceTake( origin, destination, distance, status) \
                    VALUES (?,?,?,?)";
            let origin = req.body.origin[0]+ ',' + req.body.origin[1];
            let destination = req.body.destination[0]+ ',' + req.body.destination[1];
            connection.query(insertSql, [origin, destination, distance, initialStatus], function(err, results ) {
              if(err) { 
                console.log(err); 
                res.json(errorMsg);
                return; 
              } else {
      
                let insertId = JSON.parse(JSON.stringify(results)).insertId;
                console.log("insertId->", insertId);
      
                let selectSql = "SELECT id, distance, status FROM lalalistplacetake WHERE id = ?";
                connection.query(selectSql, [ insertId ], function(err, results ) {
                  connection.release(); 
                  if(err) { 
                    console.log(err); 
                    res.json(errorMsg);
                    return; 
                  } else {
                    res.status(200).json(JSON.parse(JSON.stringify(results)));
                  }
                });
              }   
            }); 
          }
        });

      } else {
        console.log("distance cant be found");
        res.json(errorMsg);
        return;
      }    
    })
    .catch((err) => {
      console.log("google map error ->", err);
      res.json(errorMsg);
      return;
    })
  },400);
  

});

router.patch('/orders/:id',function(req,res, next) {
  // /orders/:id

  // console.log("req param ->", req.params.id);
  // console.log("req body ->", req.body.status);
  res.set('Content-Type', 'application/json');
  setTimeout(() => {
    mysqlConnectionPool.getConnection(function(err, connection) {
      if (err) { 
        console.log(err); 
        res.json(errorMsg);
        return; 
      } else {
        console.log("DB Connection successful");
        let selectSql = "SELECT status FROM lalalistplacetake where id=?";
        connection.query(selectSql, [req.params.id], function(err, results ) {
          if(err) { 
            console.log(err); 
            res.json(errorMsg);
            return; 
          } else {
            let statusToUpdate = JSON.parse(JSON.stringify(results))[0].status;
            let newStatus = "TAKEN";
            console.log("statusToUpdate->", statusToUpdate);
            if( statusToUpdate != "TAKEN" ) {
              let updateSql = "UPDATE lalalistplacetake \
                              SET status = ? \
                              where id=?";
              connection.query(updateSql, [newStatus, req.params.id], function(err, results ) {
                connection.release();
                if(err){
                  console.log(err); 
                  res.json(errorMsg);
                  return; 
                } else {
                  let outputStatus = {status: "SUCCESS"};
                  res.status(200).json(outputStatus);
                }
              });
            } else {
              res.json(errorMsg);
            }
          }
        });
      }  
    });
  }, 400);
});



module.exports = router;
