'use client'
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import axios from 'axios';
import CardComponent from './components/CardComponent';
import exp from 'constants';

interface User {
  id: number;
  name: string;
  email: string;
}

export default function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const openaiApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';

  const [userInput, setUserInput] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({ name: '', email: '' });


  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${apiUrl}/users`);
        setUsers(response.data.reverse());
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const handleUserCreation = async (nlpInput: string) => {
    console.log('User input:', nlpInput);
    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: `
          You are performing an action based on user input. 
          When user input includes create, you extract name and email from user input and return name:{name}, email:{email} to create a new user. 
          When user input includes delete, you extract id from user input and return id:{id} to delete that user.
          When user input includes update, you extract id, name and email from user input and return id:{id}, name:{name}, email:{email} to update that user.
          ` },
          { role: 'user', content: nlpInput }
        ],
        max_tokens: 150,
        temperature: 0.7,
        n: 1
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        }
      });
      
      const content = (response.data.choices[0].message.content as string)
      console.log('OpenAI response:', content);

      const createRegex = /name:\s*([^\n]+),\s*email:\s*([^\n]+)/i;
      const deleteRegex = /id:\s*(\d+)/i;
      const updateRegex = /id:\s*(\d+)\s*name:\s*([^\n]+),\s*email:\s*([^\n]+)/i;

      const createMatch = content.match(createRegex);
      const deleteMatch = content.match(deleteRegex);
      const updateMatch = content.match(updateRegex);

      if (createMatch) {

        const name = createMatch[1].trim();
        const email = createMatch[2].trim();
        const createUserResponse = await axios.post(`${apiUrl}/users`, { name, email });
        setUsers(prevUsers => [createUserResponse.data, ...prevUsers]);
        console.log('User created successfully:', createUserResponse.data);

      } else if (deleteMatch) {

        const userId = parseInt(deleteMatch[1], 10);
        await axios.delete(`${apiUrl}/users/${userId}`);
        setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
        console.log('User deleted successfully');

      } else if (updateMatch) {

        const updateUserId = parseInt(updateMatch[1], 10);
        const updateName = updateMatch[2].trim();
        const updateEmail = updateMatch[3].trim();
        await axios.put(`${apiUrl}/users/${updateUserId}`, { name:updateName, email:updateEmail });
        setUsers(prevUsers => prevUsers.map(user => {
          if (user.id === updateUserId) {
            return { ...user, name: updateName, email: updateEmail };
          }
          return user;
        }));
        console.log('User updated successfully');

      } else {
        console.log('Invalid action: Unable to extract user information.');
      }

    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const extractUserInfo = (nlpInput: any) => {
    const nameRegex = /Name:\s*([^\n]+)/i;
    const emailRegex = /Email:\s*([^\n]+)/i;

    const nameMatch = nlpInput.match(nameRegex);
    const emailMatch = nlpInput.match(emailRegex);

    const name = nameMatch ? nameMatch[1].trim() : '';
    const email = emailMatch ? emailMatch[1].trim() : '';

    return { name, email };
  };

  const handleUserInput = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleUserCreation(userInput);
  };
  

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
      <div className="space-y-4 w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-800 text-center">Perform Operations with AI Chat </h1>
        <h4 className='text-1xl font-bold text-gray-400 text-center'>Next.js Frontend, Postgres Database & Node.js Backend.</h4>

        <form onSubmit={handleUserInput} className="flex items-center">
          <input
            dir="ltr"
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Enter your request..."
            className=" w-full p-2  border text-gray-800 border-gray-300 rounded-s-lg focus:outline-none focus:border-sky-500  focus:ring-sky-500 "
          />
          <button type="submit" dir="rtl" className="flex items-center bg-sky-100 text-sky-500 px-4 py-2 border-sky-300 border rounded-s-lg ">
            <span className="ml-1"><Image src="/send-paper.png" alt="Send Icon" width={33} height={33} /></span>
            Submit
            </button>
        </form>

        <div className="space-y-2">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
              <CardComponent card={user} />
              
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
