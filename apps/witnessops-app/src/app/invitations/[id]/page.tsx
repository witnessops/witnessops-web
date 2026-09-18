import { Invitation } from '../../../components/invitation';
import { notFound } from 'next/navigation';
export default async function Page({params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id))notFound();
 return <Invitation id={id}/>;
}
