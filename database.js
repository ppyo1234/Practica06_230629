import mongoose from "mongoose"
mongoose.connect('mongodb+srv://230629:a9zkZvci3FqyQe4E@cluster0.y2evu.mongodb.net/usuarios_db?retryWrites=true&w=majority&appName=Cluster0')
.then((db)=>console.log('Mongodb atlas connected'))
.catch((error)=>console.error(error));
export default mongoose;
