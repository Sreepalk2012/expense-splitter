import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Users, DollarSign, TrendingUp, Share2, Save } from 'lucide-react';

export default function ExpenseSplitter() {
  const [people, setPeople] = useState(['Alex', 'Jordan']);
  const [newPerson, setNewPerson] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    paidBy: 'Alex',
    splitAmong: ['Alex', 'Jordan']
  });
  const [groupId, setGroupId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Initialize or load group data
  useEffect(() => {
    const initializeGroup = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlGroupId = urlParams.get('group');
      
      if (urlGroupId) {
        // Load existing group
        setGroupId(urlGroupId);
        await loadGroupData(urlGroupId);
      } else {
        // Create new group
        const newGroupId = generateGroupId();
        setGroupId(newGroupId);
        await saveGroupData(newGroupId, people, []);
      }
      setLoading(false);
    };
    
    initializeGroup();
  }, []);

  // Generate unique group ID
  const generateGroupId = () => {
    return 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  // Load group data from storage
  const loadGroupData = async (id) => {
    try {
      const result = await window.storage.get(`expenses_${id}`, true);
      if (result && result.value) {
        const data = JSON.parse(result.value);
        setPeople(data.people || ['Alex', 'Jordan']);
        setExpenses(data.expenses || []);
        setExpenseForm({
          description: '',
          amount: '',
          paidBy: data.people?.[0] || 'Alex',
          splitAmong: data.people || ['Alex', 'Jordan']
        });
      }
    } catch (error) {
      console.log('Starting fresh group');
    }
  };

  // Save group data to storage
  const saveGroupData = async (id, peopleList, expensesList) => {
    setSaving(true);
    try {
      await window.storage.set(
        `expenses_${id}`,
        JSON.stringify({
          people: peopleList,
          expenses: expensesList,
          lastUpdated: new Date().toISOString()
        }),
        true // shared = true so all users can access
      );
    } catch (error) {
      console.error('Save failed:', error);
    }
    setSaving(false);
  };

  // Auto-save when data changes
  useEffect(() => {
    if (!loading && groupId) {
      saveGroupData(groupId, people, expenses);
    }
  }, [people, expenses, groupId, loading]);

  // Generate shareable link
  const getShareableLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?group=${groupId}`;
  };

  const copyShareLink = () => {
    const link = getShareableLink();
    navigator.clipboard.writeText(link);
    alert('Link copied! Share it with your group.');
  };

  const addPerson = () => {
    if (newPerson.trim() && !people.includes(newPerson.trim())) {
      const updated = [...people, newPerson.trim()];
      setPeople(updated);
      setExpenseForm({
        ...expenseForm,
        splitAmong: updated
      });
      setNewPerson('');
    }
  };

  const removePerson = (person) => {
    if (people.length > 2) {
      const updated = people.filter(p => p !== person);
      setPeople(updated);
      setExpenseForm({
        ...expenseForm,
        paidBy: expenseForm.paidBy === person ? updated[0] : expenseForm.paidBy,
        splitAmong: expenseForm.splitAmong.filter(p => p !== person)
      });
    }
  };

  const toggleSplitPerson = (person) => {
    const isIncluded = expenseForm.splitAmong.includes(person);
    setExpenseForm({
      ...expenseForm,
      splitAmong: isIncluded 
        ? expenseForm.splitAmong.filter(p => p !== person)
        : [...expenseForm.splitAmong, person]
    });
  };

  const addExpense = () => {
    if (expenseForm.description && expenseForm.amount && expenseForm.splitAmong.length > 0) {
      setExpenses([...expenses, {
        id: Date.now(),
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        paidBy: expenseForm.paidBy,
        splitAmong: [...expenseForm.splitAmong]
      }]);
      setExpenseForm({
        description: '',
        amount: '',
        paidBy: expenseForm.paidBy,
        splitAmong: people
      });
    }
  };

  const deleteExpense = (id) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const calculateBalances = () => {
    const balances = {};
    people.forEach(person => balances[person] = 0);

    expenses.forEach(expense => {
      const shareAmount = expense.amount / expense.splitAmong.length;
      balances[expense.paidBy] += expense.amount;
      expense.splitAmong.forEach(person => {
        balances[person] -= shareAmount;
      });
    });

    return balances;
  };

  const calculateSettlements = () => {
    const balances = calculateBalances();
    const settlements = [];
    
    const debtors = Object.entries(balances)
      .filter(([_, balance]) => balance < -0.01)
      .map(([person, balance]) => ({ person, amount: -balance }))
      .sort((a, b) => b.amount - a.amount);
    
    const creditors = Object.entries(balances)
      .filter(([_, balance]) => balance > 0.01)
      .map(([person, balance]) => ({ person, amount: balance }))
      .sort((a, b) => b.amount - a.amount);

    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const payment = Math.min(debtors[i].amount, creditors[j].amount);
      settlements.push({
        from: debtors[i].person,
        to: creditors[j].person,
        amount: payment
      });

      debtors[i].amount -= payment;
      creditors[j].amount -= payment;

      if (debtors[i].amount < 0.01) i++;
      if (creditors[j].amount < 0.01) j++;
    }

    return settlements;
  };

  const balances = calculateBalances();
  const settlements = calculateSettlements();
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your group...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-2">
            <h1 className="text-4xl font-bold text-indigo-900 flex items-center gap-2">
              <DollarSign className="w-10 h-10" />
              Expense Splitter
            </h1>
            <button
              onClick={() => setShowShareModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
          <p className="text-gray-600">Track and split expenses with your group</p>
          {saving && (
            <div className="flex items-center justify-center gap-2 mt-2 text-sm text-indigo-600">
              <Save className="w-4 h-4 animate-pulse" />
              Saving...
            </div>
          )}
        </div>

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Share This Group</h3>
              <p className="text-gray-600 mb-4">
                Anyone with this link can view and add expenses to this group.
              </p>
              <div className="bg-gray-50 p-3 rounded-lg mb-4 break-all text-sm">
                {getShareableLink()}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyShareLink}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                  Copy Link
                </button>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* People Management */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="w-6 h-6" />
              People in Group
            </h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newPerson}
                onChange={(e) => setNewPerson(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addPerson()}
                placeholder="Add person..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={addPerson}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {people.map(person => (
                <div key={person} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                  <span className="font-medium text-gray-700">{person}</span>
                  <button
                    onClick={() => removePerson(person)}
                    disabled={people.length <= 2}
                    className="text-red-600 hover:text-red-800 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add Expense */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Plus className="w-6 h-6" />
              Add Expense
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                placeholder="What's this for?"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <input
                type="number"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                placeholder="Amount"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <select
                value={expenseForm.paidBy}
                onChange={(e) => setExpenseForm({...expenseForm, paidBy: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {people.map(person => (
                  <option key={person} value={person}>{person} paid</option>
                ))}
              </select>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Split among:</p>
                <div className="flex flex-wrap gap-2">
                  {people.map(person => (
                    <button
                      key={person}
                      onClick={() => toggleSplitPerson(person)}
                      className={`px-4 py-2 rounded-lg transition ${
                        expenseForm.splitAmong.includes(person)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {person}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={addExpense}
                className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition font-medium"
              >
                Add Expense
              </button>
            </div>
          </div>
        </div>

        {/* Expenses List */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              Expenses
            </span>
            <span className="text-indigo-600">${totalExpenses.toFixed(2)}</span>
          </h2>
          {expenses.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No expenses yet. Add one above!</p>
          ) : (
            <div className="space-y-3">
              {expenses.map(expense => (
                <div key={expense.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800">{expense.description}</h3>
                    <p className="text-sm text-gray-600">
                      {expense.paidBy} paid • Split among: {expense.splitAmong.join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-indigo-600">${expense.amount.toFixed(2)}</span>
                    <button
                      onClick={() => deleteExpense(expense.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Balances & Settlements */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Balances */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Balances</h2>
            <div className="space-y-2">
              {people.map(person => {
                const balance = balances[person];
                return (
                  <div key={person} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">{person}</span>
                    <span className={`font-bold ${balance > 0.01 ? 'text-green-600' : balance < -0.01 ? 'text-red-600' : 'text-gray-600'}`}>
                      {balance > 0.01 ? '+' : ''}{balance.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Settlements */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Who Pays Whom</h2>
            {settlements.length === 0 ? (
              <p className="text-gray-500 text-center py-8">All settled up! 🎉</p>
            ) : (
              <div className="space-y-3">
                {settlements.map((settlement, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-red-50 to-green-50 p-4 rounded-lg">
                    <p className="text-gray-800">
                      <span className="font-bold text-red-700">{settlement.from}</span>
                      {' → '}
                      <span className="font-bold text-green-700">{settlement.to}</span>
                    </p>
                    <p className="text-2xl font-bold text-indigo-600 mt-1">
                      ${settlement.amount.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}