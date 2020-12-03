const express= require('express');
const bodyParser=require('body-parser');
const path=require('path');
const crypto=require('crypto');
const mongoose=require('mongoose');
const multer=require('multer');
const GridFsStorage=require('multer-gridfs-storage');
const Grid=require('gridfs-Stream');
const methodOverride=require('method-override');
const app=express();

const db_name='mongodbload';
const host='localhost:27017';
const database=`mongodb://${host}/${db_name}`

app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine','ejs');



const conn =mongoose.createConnection(database,{useNewUrlParser:true,useUnifiedTopology:true})


let gfs;
conn.once('open',(resolve,reject)=>{
    gfs=Grid(conn.db,mongoose.mongo);
    gfs.collection('uploads');
});

const storage=new GridFsStorage({
    url:database,
    file:(req,file)=>{
        return new Promise((resolve,reject)=>{
            crypto.randomBytes(16,(err,buf)=>{
                if(err){
                    return reject(err);
                }
                const filename=buf.toString('hex')+path.extname(file.originalname);
                const fileInfo={
                    filename:filename,
                    bucketName:'uploads'
                };
                resolve(fileInfo);
            });
        });
    }
});
const upload=multer({storage});
app.get('/',(req,res)=>{
    gfs.files.find().toArray((err,files)=>{
        if(!files||files.length===0){
            res.render('index',{files:false});
        }else{
            files.map(file=>{
                if (
                    file.contentType==='/image/jpeg' ||
                    file.contentType==='/image/png'
                )  {
                    file.isImage=true;
                }   else{
                    file.isImage=false;
                }
            });
            res.render('index',{files:files});
        }
     });
});
/*
app.get('/',(req,res)=>{
    res.render('index');
});*/
app.post('/upload',upload.single('file'),(req,res)=>{
   // res.json({file:req.file});
   res.redirect('/');
});
//route get/files
//desc display all files in json

app.get('/files',(req,res)=>{
    gfs.files.find().toArray((err,files)=>{
        if(!files||files.length===0){
            return res.status(404).json({
                err:'no files exist'
            });
        }
        //files :exists;
        return res.json(files);
    });
});
//route to get /files/:filename
app.get('/files/:filename',(req,res)=>{
    gfs.files.findOne({filename:req.params.filename},(err,file)=>{
        if(!file||file.length===0){
            return res.status(404).json({
                err:'no files exist'
            });
        }
        //file exists
        return res.json(file)


    })
});

app.get('/image/:filename',(req,res)=>{
    gfs.files.findOne({filename:req.params.filename},(err,file)=>{
        if(!file||file.length===0){
            return res.status(404).json({
                err:'no files exist'
            });
        }
        if(file.contentType==='image/jpeg'||file.contentType==='image/png'){
            //read output to browser
            const readstream=gfs.createReadStream(file.filename);
            readstream.pipe(res);
        }else{
            res.status(404).json({
                err:'not an image'
            })
        }
        


    })


});




const port=4000;

app.listen(port,()=>console.log(`server started on port ${port}`));